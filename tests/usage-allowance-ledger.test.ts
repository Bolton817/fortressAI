import { describe, it, expect, beforeEach } from "vitest";
import { usageCreditService } from "@/core/billing/usage-credit-service";
import { usageCreditRepository } from "@/db/usage-credit-repository";
import { subscriptionRepository } from "@/db/subscription-repository";
import { AiCreditExhaustedError } from "@/core/billing/entitlement-service";

describe("AI Usage Metering & Credit Ledger (TDD §11.4, §24.3, FR-070)", () => {
  const TEST_USER = "user_usage_test_404";
  const TEST_SITE = "site_usage_test_505";

  beforeEach(() => {
    usageCreditRepository.clearAll();
    subscriptionRepository.clearAll();
  });

  it("applies the product-defined credit cost matrix per job type", () => {
    expect(usageCreditService.getJobCreditCost("full_site_generation")).toBe(10);
    expect(usageCreditService.getJobCreditCost("blog_article_generation")).toBe(2);
    expect(usageCreditService.getJobCreditCost("section_regeneration")).toBe(1);
    expect(usageCreditService.getJobCreditCost("field_edit")).toBe(0); // Complimentary
    expect(usageCreditService.getJobCreditCost("style_tweak")).toBe(0); // Complimentary
  });

  it("debits credits correctly and tracks remaining balance", async () => {
    // Free tier has 15 monthly credits
    const balanceBefore = await usageCreditService.getUsageBalance(TEST_USER);
    expect(balanceBefore.totalMonthlyCredits).toBe(15);
    expect(balanceBefore.usedCredits).toBe(0);
    expect(balanceBefore.remainingCredits).toBe(15);

    // Debit for a full site generation (10 credits)
    const record = await usageCreditService.debitCredits({
      userId: TEST_USER,
      siteId: TEST_SITE,
      jobId: "job_site_gen_001",
      jobType: "full_site_generation",
      idempotencyKey: "idemp_job_site_gen_001",
    });

    expect(record.creditsDeducted).toBe(10);
    expect(record.status).toBe("debited");

    const balanceAfter = await usageCreditService.getUsageBalance(TEST_USER);
    expect(balanceAfter.usedCredits).toBe(10);
    expect(balanceAfter.remainingCredits).toBe(5);
    expect(balanceAfter.percentUsed).toBe(67);
  });

  it("strictly prevents double-debiting on duplicate/retried job calls (FR-070, FR-077)", async () => {
    // 1st call
    const firstDebit = await usageCreditService.debitCredits({
      userId: TEST_USER,
      siteId: TEST_SITE,
      jobId: "job_section_002",
      jobType: "section_regeneration",
      idempotencyKey: "idemp_retry_guard_key_777",
    });
    expect(firstDebit.creditsDeducted).toBe(1);

    // 2nd call (same idempotency key)
    const secondDebit = await usageCreditService.debitCredits({
      userId: TEST_USER,
      siteId: TEST_SITE,
      jobId: "job_section_002",
      jobType: "section_regeneration",
      idempotencyKey: "idemp_retry_guard_key_777",
    });

    expect(secondDebit.id).toBe(firstDebit.id);

    // Total used must be only 1, not 2
    const balance = await usageCreditService.getUsageBalance(TEST_USER);
    expect(balance.usedCredits).toBe(1);
  });

  it("platform failure refund policy: refunds credits immediately on platform errors (FR-070)", async () => {
    // 1. Debit credits for a job
    await usageCreditService.debitCredits({
      userId: TEST_USER,
      siteId: TEST_SITE,
      jobId: "job_blog_fail_003",
      jobType: "blog_article_generation",
      idempotencyKey: "idemp_blog_fail_003",
    });

    let balance = await usageCreditService.getUsageBalance(TEST_USER);
    expect(balance.usedCredits).toBe(2);

    // 2. Refund due to platform failure
    const refundRecord = await usageCreditService.refundFailedJob(
      "job_blog_fail_003",
      "Model provider timeout during generation"
    );

    expect(refundRecord).toBeDefined();
    expect(refundRecord?.status).toBe("refunded");
    expect(refundRecord?.refundReason).toContain("timeout");

    // 3. Verify net credits restored
    balance = await usageCreditService.getUsageBalance(TEST_USER);
    expect(balance.usedCredits).toBe(0);
    expect(balance.remainingCredits).toBe(15);
  });

  it("enforces allowance exhaustion: prevents new chargeable jobs when balance reaches 0 (FR-070)", async () => {
    // On Free tier (15 credits), consume 10 (site) + 2 (article) + 2 (article) + 1 (section) = 15
    await usageCreditService.debitCredits({
      userId: TEST_USER,
      siteId: TEST_SITE,
      jobId: "job_1",
      jobType: "full_site_generation",
      idempotencyKey: "idemp_exhaust_1",
    });
    await usageCreditService.debitCredits({
      userId: TEST_USER,
      siteId: TEST_SITE,
      jobId: "job_2",
      jobType: "blog_article_generation",
      idempotencyKey: "idemp_exhaust_2",
    });
    await usageCreditService.debitCredits({
      userId: TEST_USER,
      siteId: TEST_SITE,
      jobId: "job_3",
      jobType: "blog_article_generation",
      idempotencyKey: "idemp_exhaust_3",
    });
    await usageCreditService.debitCredits({
      userId: TEST_USER,
      siteId: TEST_SITE,
      jobId: "job_4",
      jobType: "section_regeneration",
      idempotencyKey: "idemp_exhaust_4",
    });

    const balance = await usageCreditService.getUsageBalance(TEST_USER);
    expect(balance.remainingCredits).toBe(0);

    // Next chargeable job should be rejected
    await expect(
      usageCreditService.debitCredits({
        userId: TEST_USER,
        siteId: TEST_SITE,
        jobId: "job_exhausted_attempt",
        jobType: "section_regeneration",
        idempotencyKey: "idemp_exhaust_fail",
      })
    ).rejects.toThrow(AiCreditExhaustedError);

    // Complimentary (0 credit) jobs still succeed!
    await expect(
      usageCreditService.debitCredits({
        userId: TEST_USER,
        siteId: TEST_SITE,
        jobId: "job_free_edit",
        jobType: "field_edit",
        idempotencyKey: "idemp_free_edit_ok",
      })
    ).resolves.not.toThrow();
  });
});
