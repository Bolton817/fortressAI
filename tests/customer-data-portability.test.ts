import { describe, it, expect, beforeEach } from "vitest";
import { dataPortabilityService } from "@/core/export/data-portability-service";
import { invoiceRepository } from "@/db/invoice-repository";
import { subscriptionRepository } from "@/db/subscription-repository";
import { newsletterRepository } from "@/db/newsletter-repository";
import { usageCreditRepository } from "@/db/usage-credit-repository";
import { seedPhase0Tenants, USER_A_ID, USER_B_ID, SITE_A_ID } from "@/db/seed-data";

describe("Phase 7: Customer Data Portability (TDD §30.1–§30.3, FR-084)", () => {
  beforeEach(async () => {
    seedPhase0Tenants();
    subscriptionRepository.clearAll();
    invoiceRepository.clearAll();
    usageCreditRepository.clearAll();

    // Create billing & consent data for User A
    subscriptionRepository.createSubscription({
      userId: USER_A_ID,
      planId: "starter",
      billingInterval: "monthly",
      currency: "USD",
    });

    invoiceRepository.createInvoice({
      userId: USER_A_ID,
      subscriptionId: "sub_test_a",
      currency: "USD",
      amountMinorUnits: 1900,
      lineItems: [
        {
          description: "Starter Plan (Monthly)",
          amountMinorUnits: 1900,
          quantity: 1,
          category: "subscription",
        },
      ],
    });

    usageCreditRepository.recordDebit({
      userId: USER_A_ID,
      siteId: "site_test_a",
      jobId: "job_site_gen_1",
      jobType: "full_site_generation",
      creditsDeducted: 10,
      idempotencyKey: "idem_debit_test_1",
    });

    newsletterRepository.recordConsent({
      email: "safari@marahorizon.co.ke",
      status: "subscribed",
      optInSource: "registration_checkbox",
    });
  });

  it("produces a structured, comprehensive account data bundle for the customer", async () => {
    const bundle = await dataPortabilityService.generateAccountExport(USER_A_ID);

    expect(bundle.exportVersion).toBe("1.0.0");
    expect(bundle.exportedAt).toBeDefined();

    // User profile
    expect(bundle.user.id).toBe(USER_A_ID);
    expect(bundle.user.email).toBe("safari@marahorizon.co.ke");

    // Sites
    expect(bundle.sites.length).toBeGreaterThanOrEqual(1);
    expect(bundle.sites[0].site.id).toBe(SITE_A_ID);
    expect(bundle.sites[0].draftConfiguration).toBeDefined();

    // Financial records
    expect(bundle.billing.subscription).toBeDefined();
    expect(bundle.billing.subscription.planId).toBe("starter");
    expect(bundle.billing.invoices.length).toBe(1);
    expect(bundle.billing.invoices[0].amountMinorUnits).toBe(1900);
    expect(bundle.billing.usageHistory.length).toBe(1);

    // Privacy & Consent
    expect(bundle.privacyAndConsent.newsletterConsent?.status).toBe("subscribed");
  });

  it("strictly enforces tenant isolation and excludes other customers' data", async () => {
    const bundleA = await dataPortabilityService.generateAccountExport(USER_A_ID);

    // Ensure User B's site or data does not appear anywhere in User A's export
    const siteIds = bundleA.sites.map((s) => s.site.id);
    expect(siteIds).not.toContain(SITE_A_ID === "e2d56a78-29bf-45ce-8fa5-7bf611e9f1a1" ? "f8a91c32-68da-48eb-9d14-3a25d9c7e2b2" : "other_site");

    const jsonString = JSON.stringify(bundleA);
    expect(jsonString).not.toContain(USER_B_ID);
    expect(jsonString).not.toContain("consulting@nairobiadvisory.co.ke");
  });

  it("strictly strips platform passwords, password hashes, and provider credentials", async () => {
    const bundle = await dataPortabilityService.generateAccountExport(USER_A_ID);
    const jsonString = JSON.stringify(bundle);

    // Invariants
    expect(jsonString).not.toContain("passwordHash");
    expect(jsonString).not.toContain("INTASEND_SECRET_KEY");
    expect(jsonString).not.toContain("BREVO_API_KEY");
    expect(jsonString).not.toContain("SESSION_SECRET");
    expect(jsonString).not.toContain("system_prompt");
  });
});
