import { usageCreditRepository, StoredUsageCreditRecord } from "@/db/usage-credit-repository";
import { subscriptionRepository } from "@/db/subscription-repository";
import { PlanCatalog } from "./plan-catalog";
import { entitlementService, AiCreditExhaustedError } from "./entitlement-service";

/**
 * Fortress AI — AI Usage Credit Service (TDD §11.4, §24.3, FR-070)
 * Translates AI jobs into understandable customer credits with failure refund semantics.
 */

export const JOB_CREDIT_COSTS: Record<string, number> = {
  full_site_generation: 10,
  intake_generation: 10,
  section_regeneration: 1,
  blog_article_generation: 2,
  field_edit: 0,
  style_tweak: 0,
  seo_generation: 1,
};

export interface UsageBalanceSummary {
  totalMonthlyCredits: number;
  usedCredits: number;
  remainingCredits: number;
  percentUsed: number;
  billingPeriodStart: string;
  nextResetDate: string;
  tierName: string;
}

export class UsageCreditService {
  /**
   * Resolves credit cost for a specific AI job type.
   */
  getJobCreditCost(jobType: string): number {
    return JOB_CREDIT_COSTS[jobType] ?? 1;
  }

  /**
   * Returns customer-friendly usage balance with consumption percentage and reset date.
   */
  async getUsageBalance(userId: string): Promise<UsageBalanceSummary> {
    const plan = await entitlementService.getActivePlan(userId);
    const sub = subscriptionRepository.getActiveSubscriptionForUser(userId);

    const now = new Date();
    const periodStart = sub
      ? sub.currentPeriodStart
      : new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const periodEnd = sub
      ? sub.currentPeriodEnd
      : new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    const used = usageCreditRepository.getNetCreditsUsedInPeriod(userId, periodStart);
    const total = plan.entitlements.monthlyAiCredits;
    const remaining = Math.max(0, total - used);
    const percentUsed = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 100;

    return {
      totalMonthlyCredits: total,
      usedCredits: used,
      remainingCredits: remaining,
      percentUsed,
      billingPeriodStart: periodStart,
      nextResetDate: periodEnd,
      tierName: plan.name,
    };
  }

  /**
   * Debits credits for a job. Throws AiCreditExhaustedError if insufficient balance.
   * Invariant: Idempotent - repeating the same job with the same idempotency key does not double-debit.
   */
  async debitCredits(params: {
    userId: string;
    siteId: string;
    jobId: string;
    jobType: string;
    idempotencyKey: string;
    providerCostMinorUnits?: number;
  }): Promise<StoredUsageCreditRecord> {
    const cost = this.getJobCreditCost(params.jobType);

    // If already recorded under this idempotency key, return existing record
    const existing = usageCreditRepository.getByIdempotencyKey(params.idempotencyKey);
    if (existing) {
      return existing;
    }

    if (cost > 0) {
      await entitlementService.assertCanRunAiGeneration(params.userId, params.siteId, cost);
    }

    return usageCreditRepository.recordDebit({
      userId: params.userId,
      siteId: params.siteId,
      jobId: params.jobId,
      jobType: params.jobType,
      creditsDeducted: cost,
      providerCostMinorUnits: params.providerCostMinorUnits || 0,
      idempotencyKey: params.idempotencyKey,
    });
  }

  /**
   * Releases or refunds credits if an AI generation fails due to a platform-level issue.
   * Invariant: Platform failures never silently consume customer credits (FR-070).
   */
  async refundFailedJob(jobId: string, reason: string): Promise<StoredUsageCreditRecord | null> {
    return usageCreditRepository.refundCredits(jobId, reason);
  }
}

export const usageCreditService = new UsageCreditService();
