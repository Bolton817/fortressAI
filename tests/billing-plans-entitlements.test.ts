import { describe, it, expect, beforeEach } from "vitest";
import { PlanCatalog, PLAN_CATALOG } from "@/core/billing/plan-catalog";
import {
  EntitlementService,
  QuotaExceededError,
  FeatureNotEntitledError,
} from "@/core/billing/entitlement-service";
import { subscriptionRepository } from "@/db/subscription-repository";
import { tenantRepository } from "@/db/tenant-repository";
import { domainRepository } from "@/db/domain-repository";
import { seedPhase0Tenants, USER_C_ID, SITE_C_ID } from "@/db/seed-data";

describe("Plan Catalog & Entitlement Enforcement (TDD §8, §24.1, FR-069)", () => {
  const TEST_USER = "user_entitlements_test_101";
  const TEST_SITE = "site_entitlements_test_202";
  let service: EntitlementService;

  beforeEach(() => {
    subscriptionRepository.clearAll();
    tenantRepository.clearAll();
    domainRepository.clearAll();
    service = new EntitlementService();
  });

  it("exposes all 4 product tiers with complete quotas and multi-currency pricing", () => {
    const plans = PlanCatalog.getAllPlans();
    expect(plans.length).toBe(4);

    const starter = PlanCatalog.getPlan("starter");
    expect(starter.name).toBe("Starter");
    expect(starter.entitlements.maxSites).toBe(3);
    expect(starter.entitlements.maxPagesPerSite).toBe(10);
    expect(starter.entitlements.monthlyAiCredits).toBe(100);
    expect(starter.entitlements.maxCustomDomains).toBe(1);
    expect(starter.entitlements.exportAllowed).toBe(true);

    // Multi-currency pricing
    expect(starter.pricing.USD.monthlyMinorUnits).toBe(1900); // $19.00
    expect(starter.pricing.USD.annualMinorUnits).toBe(19000);  // $190.00 (2 months free)
    expect(starter.pricing.KES.monthlyMinorUnits).toBe(250000); // KES 2,500.00
  });

  it("calculates annual discount correctly giving 2 months free", () => {
    const proMonthly = PlanCatalog.calculatePrice("pro", "monthly", "USD");
    const proAnnual = PlanCatalog.calculatePrice("pro", "annual", "USD");

    expect(proMonthly.amountMinorUnits).toBe(4900);
    // 10 months * 4900 = 49000 (saves 2 months * 4900 = 9800)
    expect(proAnnual.amountMinorUnits).toBe(49000);
    expect(proAnnual.amountMinorUnits).toBe(proMonthly.amountMinorUnits * 10);
  });

  it("defaults user to Free Trial tier when no active subscription exists", async () => {
    const activePlan = await service.getActivePlan(TEST_USER);
    expect(activePlan.id).toBe("free");
    expect(activePlan.entitlements.maxSites).toBe(1);
    expect(activePlan.entitlements.exportAllowed).toBe(false);
    expect(activePlan.entitlements.maxCustomDomains).toBe(0);
  });

  it("strictly enforces site quota at the server boundary (FR-069)", async () => {
    // 1. On Free tier, maxSites is 1
    await service.assertCanCreateSite(TEST_USER); // Allowed (0 sites)

    // Seed 1 site
    await tenantRepository.createSite(TEST_USER, "Acme First Site", "acme-first");

    // 2nd site creation should fail on Free tier
    await expect(service.assertCanCreateSite(TEST_USER)).rejects.toThrow(QuotaExceededError);

    // Upgrade user to Starter (maxSites = 3)
    subscriptionRepository.createSubscription({
      userId: TEST_USER,
      planId: "starter",
    });

    // Now allowed to add another site
    await expect(service.assertCanCreateSite(TEST_USER)).resolves.not.toThrow();
  });

  it("strictly enforces page quota per site at the server boundary (FR-069)", async () => {
    seedPhase0Tenants();

    // User C has 5 pages on SITE_C_ID. Free tier quota is max 3 pages per site -> throws QuotaExceededError
    await expect(service.assertCanAddPage(USER_C_ID, SITE_C_ID)).rejects.toThrow(QuotaExceededError);

    // Upgrade to Starter (maxPagesPerSite = 10) -> allowed
    subscriptionRepository.createSubscription({
      userId: USER_C_ID,
      planId: "starter",
    });

    await expect(service.assertCanAddPage(USER_C_ID, SITE_C_ID)).resolves.not.toThrow();
  });

  it("blocks custom domain attachment on Free tier and enforces limits on Starter", async () => {
    // Free tier: maxCustomDomains is 0
    await expect(service.assertCanAttachCustomDomain(TEST_USER, TEST_SITE)).rejects.toThrow(
      FeatureNotEntitledError
    );

    // Upgrade to Starter (maxCustomDomains = 1)
    subscriptionRepository.createSubscription({
      userId: TEST_USER,
      planId: "starter",
    });

    // Allowed (0 custom domains currently)
    await expect(service.assertCanAttachCustomDomain(TEST_USER, TEST_SITE)).resolves.not.toThrow();

    // Attach 1 custom domain
    domainRepository.createDomain(TEST_SITE, "acme.co.ke", "custom_apex");

    // Attempting 2nd custom domain on Starter fails
    await expect(service.assertCanAttachCustomDomain(TEST_USER, TEST_SITE)).rejects.toThrow(
      QuotaExceededError
    );
  });

  it("blocks static code export on Free tier and enables on Starter/Pro", async () => {
    // Free tier has exportAllowed = false
    await expect(service.assertCanExportSite(TEST_USER, TEST_SITE)).rejects.toThrow(
      FeatureNotEntitledError
    );

    // Upgrade to Professional
    subscriptionRepository.createSubscription({
      userId: TEST_USER,
      planId: "pro",
    });

    // Allowed
    await expect(service.assertCanExportSite(TEST_USER, TEST_SITE)).resolves.not.toThrow();
  });

  it("reverts to Free tier entitlements when subscription expires", async () => {
    // Create an expired subscription
    const pastStart = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const pastEnd = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    subscriptionRepository.createSubscription({
      userId: TEST_USER,
      planId: "pro",
      status: "expired",
    });

    const activePlan = await service.getActivePlan(TEST_USER);
    expect(activePlan.id).toBe("free");
    expect(activePlan.entitlements.exportAllowed).toBe(false);
  });
});
