import { subscriptionRepository } from "@/db/subscription-repository";
import { tenantRepository } from "@/db/tenant-repository";
import { domainRepository } from "@/db/domain-repository";
import { PlanCatalog, PlanDefinition, PlanEntitlements } from "./plan-catalog";
import { usageCreditRepository } from "@/db/usage-credit-repository";

/**
 * Fortress AI — Entitlement Service (TDD §8, §24.1, FR-069, FR-070)
 * Server-authoritative enforcement of resource quotas, feature entitlements, and limits.
 */

export class QuotaExceededError extends Error {
  public readonly code = "QUOTA_EXCEEDED";
  public readonly quotaName: string;
  public readonly currentCount: number;
  public readonly maxAllowed: number;

  constructor(message: string, quotaName: string, currentCount: number, maxAllowed: number) {
    super(message);
    this.name = "QuotaExceededError";
    this.quotaName = quotaName;
    this.currentCount = currentCount;
    this.maxAllowed = maxAllowed;
  }
}

export class FeatureNotEntitledError extends Error {
  public readonly code = "FEATURE_NOT_ENTITLED";
  public readonly feature: string;

  constructor(message: string, feature: string) {
    super(message);
    this.name = "FeatureNotEntitledError";
    this.feature = feature;
  }
}

export class AiCreditExhaustedError extends Error {
  public readonly code = "AI_CREDITS_EXHAUSTED";
  public readonly requiredCredits: number;
  public readonly remainingCredits: number;

  constructor(message: string, requiredCredits: number, remainingCredits: number) {
    super(message);
    this.name = "AiCreditExhaustedError";
    this.requiredCredits = requiredCredits;
    this.remainingCredits = remainingCredits;
  }
}

export class EntitlementService {
  /**
   * Resolves the active plan definition for a user.
   * Defaults to Free Trial if no subscription is active.
   */
  async getActivePlan(userId: string): Promise<PlanDefinition> {
    const sub = subscriptionRepository.getActiveSubscriptionForUser(userId);
    if (!sub) {
      return PlanCatalog.getPlan("free");
    }

    // Check if period has ended without renewal
    const periodEnd = new Date(sub.currentPeriodEnd).getTime();
    if (Date.now() > periodEnd && sub.status !== "past_due") {
      // Expired
      return PlanCatalog.getPlan("free");
    }

    return PlanCatalog.getPlan(sub.planId);
  }

  async getEntitlements(userId: string): Promise<PlanEntitlements> {
    const plan = await this.getActivePlan(userId);
    return plan.entitlements;
  }

  /**
   * Asserts user has allowance to create another website.
   */
  async assertCanCreateSite(userId: string): Promise<void> {
    const entitlements = await this.getEntitlements(userId);
    const existingSites = await tenantRepository.listSitesForUser(userId);
    const count = existingSites.length;

    if (count >= entitlements.maxSites) {
      const plan = await this.getActivePlan(userId);
      throw new QuotaExceededError(
        `Website limit reached: Maximum ${entitlements.maxSites} sites allowed on ${plan.name}. Please upgrade to add more sites.`,
        "maxSites",
        count,
        entitlements.maxSites
      );
    }
  }

  /**
   * Asserts user can add another page to the specified site.
   */
  async assertCanAddPage(userId: string, siteId: string): Promise<void> {
    const entitlements = await this.getEntitlements(userId);
    const config = await tenantRepository.getDraftConfiguration({ userId }, siteId);
    const pageCount = config.pages?.length || 0;

    if (pageCount >= entitlements.maxPagesPerSite) {
      const plan = await this.getActivePlan(userId);
      throw new QuotaExceededError(
        `Page limit reached: Maximum ${entitlements.maxPagesPerSite} pages allowed per site on ${plan.name}. Upgrade your plan to expand.`,
        "maxPagesPerSite",
        pageCount,
        entitlements.maxPagesPerSite
      );
    }
  }

  /**
   * Asserts user can attach another custom domain to the specified site.
   */
  async assertCanAttachCustomDomain(userId: string, siteId: string): Promise<void> {
    const entitlements = await this.getEntitlements(userId);
    if (entitlements.maxCustomDomains <= 0) {
      throw new FeatureNotEntitledError(
        "Custom domain attachment is not available on your current plan. Upgrade to Starter or higher to connect custom domains.",
        "customDomains"
      );
    }

    const domains = domainRepository.listDomainsForSite(siteId);
    const customDomains = domains.filter((d) => d.domainType !== "platform_subdomain");
    if (customDomains.length >= entitlements.maxCustomDomains) {
      const plan = await this.getActivePlan(userId);
      throw new QuotaExceededError(
        `Custom domain limit reached: Maximum ${entitlements.maxCustomDomains} custom domain(s) allowed on ${plan.name}.`,
        "maxCustomDomains",
        customDomains.length,
        entitlements.maxCustomDomains
      );
    }
  }

  /**
   * Asserts user is entitled to static site code and asset export.
   */
  async assertCanExportSite(userId: string, _siteId: string): Promise<void> {
    const entitlements = await this.getEntitlements(userId);
    if (!entitlements.exportAllowed) {
      throw new FeatureNotEntitledError(
        "Full static export is a paid feature. Upgrade to Starter or Professional to download source code and deploy anywhere.",
        "export"
      );
    }
  }

  /**
   * Asserts user has sufficient AI credits to run a generation job.
   */
  async assertCanRunAiGeneration(
    userId: string,
    _siteId: string,
    requiredCredits: number
  ): Promise<void> {
    const plan = await this.getActivePlan(userId);
    const sub = subscriptionRepository.getActiveSubscriptionForUser(userId);
    const periodStart = sub ? sub.currentPeriodStart : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const used = usageCreditRepository.getNetCreditsUsedInPeriod(userId, periodStart);
    const remaining = Math.max(0, plan.entitlements.monthlyAiCredits - used);

    if (remaining < requiredCredits) {
      throw new AiCreditExhaustedError(
        `Insufficient AI credits: This operation requires ${requiredCredits} credit(s), but only ${remaining} credit(s) remain for your current billing cycle.`,
        requiredCredits,
        remaining
      );
    }
  }
}

export const entitlementService = new EntitlementService();
