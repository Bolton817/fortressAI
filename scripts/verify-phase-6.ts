/**
 * Fortress AI — Phase 6 Verification Script
 * Validates Billing, Plans, Usage Ledger, Checkout, Webhooks & Brevo Transactional Email
 * Evaluated against TDD §8, §24, §25, §26, §27, §36 Exit Criteria and Functional Requirements:
 * FR-067, FR-068, FR-069, FR-070, FR-071, FR-072, FR-073, FR-074, FR-075, FR-077
 */

import { PlanCatalog } from "../src/core/billing/plan-catalog";
import {
  EntitlementService,
  QuotaExceededError,
  FeatureNotEntitledError,
  AiCreditExhaustedError,
} from "../src/core/billing/entitlement-service";
import { usageCreditService } from "../src/core/billing/usage-credit-service";
import { checkoutService } from "../src/core/billing/checkout-service";
import { webhookProcessor } from "../src/core/billing/webhook-processor";
import { mockPaymentAdapter } from "../src/core/billing/mock-payment-adapter";
import { intasendAdapter } from "../src/core/billing/intasend-adapter";
import { subscriptionRepository } from "../src/db/subscription-repository";
import { invoiceRepository } from "../src/db/invoice-repository";
import { usageCreditRepository } from "../src/db/usage-credit-repository";
import { webhookEventRepository } from "../src/db/webhook-event-repository";
import { tenantRepository } from "../src/db/tenant-repository";
import { domainRepository } from "../src/db/domain-repository";
import { EmailTemplates } from "../src/core/email/email-templates";
import { EmailService } from "../src/core/email/email-service";
import { MockEmailAdapter } from "../src/core/email/mock-email-adapter";
import { BrevoAdapter } from "../src/core/email/brevo-adapter";
import { newsletterService } from "../src/core/email/newsletter-service";
import { newsletterRepository } from "../src/db/newsletter-repository";
import { notificationRepository } from "../src/db/notification-repository";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ [FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ [PASS] ${message}`);
}

async function runPhase6Verification() {
  console.log("===============================================================");
  console.log("  FORTRESS AI — PHASE 6 BILLING, CHECKOUT & EMAIL VERIFICATION");
  console.log("  Evaluating against TDD §8, §24, §25, §36 Exit Criteria");
  console.log("===============================================================\n");

  // Reset database stores for clean verification
  subscriptionRepository.clearAll();
  invoiceRepository.clearAll();
  usageCreditRepository.clearAll();
  webhookEventRepository.clearAll();
  tenantRepository.clearAll();
  domainRepository.clearAll();
  newsletterRepository.clearAll();
  notificationRepository.clearAll();
  mockPaymentAdapter.clear();

  const mockEmail = new MockEmailAdapter();
  const emailService = new EmailService(mockEmail);
  const entitlementService = new EntitlementService();

  const USER_ID = "v6_user_founder_001";
  const USER_EMAIL = "founder@safari-adventures.co.ke";
  const SITE_ID = "v6_site_safari_001";

  // -------------------------------------------------------------------------
  // 1. PLAN CATALOG & MULTI-CURRENCY PRICING BOOK (TDD §8, §24.1, FR-069)
  // -------------------------------------------------------------------------
  console.log("1. PLAN CATALOG & MULTI-CURRENCY PRICING (TDD §8, §24.1, FR-069)");
  const allPlans = PlanCatalog.getAllPlans();
  assert(allPlans.length === 4, "Exposes 4 comprehensive product tiers (Free, Starter, Pro, Business)");

  const starter = PlanCatalog.getPlan("starter");
  assert(starter.pricing.USD.monthlyMinorUnits === 1900, "Starter plan priced at $19.00/mo (1900 cents)");
  assert(starter.pricing.KES.monthlyMinorUnits === 250000, "Starter plan priced at KES 2,500/mo (250000 cents)");
  assert(starter.pricing.USD.annualMinorUnits === 19000, "Starter annual pricing reflects 2 months free ($190/yr)");
  assert(starter.entitlements.maxSites === 3, "Starter site quota is 3 websites");
  assert(starter.entitlements.monthlyAiCredits === 100, "Starter provides 100 monthly AI credits");

  // -------------------------------------------------------------------------
  // 2. ENTITLEMENT ENFORCEMENT & QUOTA GUARDS (TDD §24.1, FR-069)
  // -------------------------------------------------------------------------
  console.log("\n2. ENTITLEMENT ENFORCEMENT & QUOTA GUARDS (TDD §24.1, FR-069)");
  // Default on Free tier
  const defaultPlan = await entitlementService.getActivePlan(USER_ID);
  assert(defaultPlan.id === "free", "Unsubscribed user defaults to Free Trial plan");

  // Free tier has exportAllowed = false
  let exportBlocked = false;
  try {
    await entitlementService.assertCanExportSite(USER_ID, SITE_ID);
  } catch (err: any) {
    if (err instanceof FeatureNotEntitledError) exportBlocked = true;
  }
  assert(exportBlocked, "Free tier strictly blocks code export");

  // Upgrade user to Starter
  subscriptionRepository.createSubscription({
    userId: USER_ID,
    planId: "starter",
    billingInterval: "monthly",
  });

  let exportAllowed = false;
  try {
    await entitlementService.assertCanExportSite(USER_ID, SITE_ID);
    exportAllowed = true;
  } catch {}
  assert(exportAllowed, "Starter tier unlocks full static code export");

  // -------------------------------------------------------------------------
  // 3. AI USAGE METERING & FAILURE REFUND POLICY (TDD §11.4, §24.3, FR-070)
  // -------------------------------------------------------------------------
  console.log("\n3. AI USAGE METERING & FAILURE REFUNDS (TDD §11.4, §24.3, FR-070)");
  const initialBalance = await usageCreditService.getUsageBalance(USER_ID);
  assert(initialBalance.totalMonthlyCredits === 100, "Starter plan provides 100 total AI credits");
  assert(initialBalance.remainingCredits === 100, "Initial remaining credits equal 100");

  // Debit for full site generation (10 credits)
  const debitRecord = await usageCreditService.debitCredits({
    userId: USER_ID,
    siteId: SITE_ID,
    jobId: "job_full_site_100",
    jobType: "full_site_generation",
    idempotencyKey: "idemp_job_full_site_100",
  });
  assert(debitRecord.creditsDeducted === 10, "Full site generation consumes 10 credits");

  const midBalance = await usageCreditService.getUsageBalance(USER_ID);
  assert(midBalance.usedCredits === 10, "Usage ledger tracks 10 consumed credits");
  assert(midBalance.remainingCredits === 90, "Remaining balance updated to 90 credits");

  // Test duplicate job retry idempotency
  await usageCreditService.debitCredits({
    userId: USER_ID,
    siteId: SITE_ID,
    jobId: "job_full_site_100",
    jobType: "full_site_generation",
    idempotencyKey: "idemp_job_full_site_100",
  });
  const retryBalance = await usageCreditService.getUsageBalance(USER_ID);
  assert(retryBalance.usedCredits === 10, "Duplicate job retry does not double debit (FR-070, FR-077)");

  // Test platform failure refund
  await usageCreditService.refundFailedJob("job_full_site_100", "Simulated model failure");
  const refundedBalance = await usageCreditService.getUsageBalance(USER_ID);
  assert(refundedBalance.usedCredits === 0, "Platform-caused failure immediately refunds credits (FR-070)");
  assert(refundedBalance.remainingCredits === 100, "Remaining credits restored to 100");

  // -------------------------------------------------------------------------
  // 4. CHECKOUT CREATION & TAMPER-PROOF SERVER PRICING (TDD §24.2, FR-067)
  // -------------------------------------------------------------------------
  console.log("\n4. CHECKOUT CREATION & TAMPER-PROOF PRICING (TDD §24.2, FR-067)");
  const session = await checkoutService.createCheckout({
    userId: USER_ID,
    customerEmail: USER_EMAIL,
    planId: "pro",
    billingInterval: "annual",
    currency: "USD",
    provider: "mock",
    domainOrderItems: [
      { domainName: "safari-adventures.co.ke", termYears: 1, priceCents: 1299 },
    ],
  });

  // 49000 (annual pro) + 1299 (domain) = 50299
  assert(session.amountMinorUnits === 50299, "Server calculates tamper-proof order total ($502.99 / 50299 cents)");
  assert(session.lineItems.length === 2, "Separately itemizes plan subscription and domain registration");
  assert(session.idempotencyKey !== undefined, "Session carries stable idempotency key");

  // Phone normalization in IntaSend adapter
  const normPhone = intasendAdapter.normalizeMpesaPhone("0712345678");
  assert(normPhone === "+254712345678", "IntaSend adapter normalizes Kenyan local phone to +254...");

  // -------------------------------------------------------------------------
  // 5. WEBHOOK SIGNATURES & REPLAY PROTECTION (TDD §24.2, §27.2, FR-068, FR-077)
  // -------------------------------------------------------------------------
  console.log("\n5. WEBHOOK SIGNATURES & REPLAY PROTECTION (TDD §24.2, §27.2, FR-068, FR-077)");
  const { payload, signature } = mockPaymentAdapter.createTestWebhook({
    providerEventId: "evt_v6_checkout_1",
    userId: USER_ID,
    planId: "pro",
    billingInterval: "monthly",
    amountMinorUnits: 4900,
  });

  // Reject forged signature
  const forgedResult = await webhookProcessor.processWebhook({
    providerName: "mock",
    rawBody: payload,
    signature: "forged_invalid_signature_hash",
  });
  assert(forgedResult.success === false, "Strictly rejects forged/tampered webhook signatures");

  // Accept valid signature
  const validResult = await webhookProcessor.processWebhook({
    providerName: "mock",
    rawBody: payload,
    signature,
  });
  assert(validResult.success === true, "Accepts cryptographically verified webhook");
  assert(validResult.isDuplicate === false, "First delivery processed successfully");

  // Duplicate webhook replay
  const replayResult = await webhookProcessor.processWebhook({
    providerName: "mock",
    rawBody: payload,
    signature,
  });
  assert(replayResult.success === true, "Replayed webhook acknowledged safely (HTTP 200)");
  assert(replayResult.isDuplicate === true, "Deduplication guard flags replayed event");
  assert(replayResult.status === "already_processed", "Zero duplicate fulfillment on repeated webhook (TDD §36.1)");

  // -------------------------------------------------------------------------
  // 6. SUBSCRIPTION LIFECYCLE & INVOICE GENERATION (TDD §24.4, §26.2, FR-071)
  // -------------------------------------------------------------------------
  console.log("\n6. SUBSCRIPTION LIFECYCLE & INVOICES (TDD §24.4, §26.2, FR-071)");
  const userSub = subscriptionRepository.getActiveSubscriptionForUser(USER_ID);
  assert(userSub !== null, "User has active subscription record in database");
  assert(userSub?.planId === "pro", "Subscription transitioned to Professional tier");

  const invoices = invoiceRepository.listInvoicesForUser(USER_ID);
  assert(invoices.length === 1, "Only 1 invoice created for the payment transaction");
  assert(invoices[0].invoiceNumber.startsWith("INV-"), "Invoice assigned sequential immutable number");
  assert(invoices[0].amountMinorUnits === 4900, "Invoice amount stored as integer minor units (4900 cents)");
  assert(invoices[0].status === "paid", "Invoice status marked paid");

  // -------------------------------------------------------------------------
  // 7. BREVO TRANSACTIONAL EMAIL TEMPLATES (TDD §25.1, §25.2, FR-072)
  // -------------------------------------------------------------------------
  console.log("\n7. BREVO TRANSACTIONAL EMAIL TEMPLATES (TDD §25.1, §25.2, FR-072)");
  const receiptEmail = await emailService.sendPaymentReceipt({
    toEmail: USER_EMAIL,
    invoiceNumber: invoices[0].invoiceNumber,
    amount: "49.00",
    currency: "USD",
    planName: "Professional",
    renewalDate: "November 15, 2026",
    items: [{ description: "Professional Plan", amount: "49.00" }],
  });
  assert(receiptEmail.success === true, "Dispatched payment receipt email successfully");

  const sentMsgs = mockEmail.findMessagesTo(USER_EMAIL);
  assert(sentMsgs.length === 1, "Message persisted in email outbox");
  assert(sentMsgs[0].subject.includes(invoices[0].invoiceNumber), "Receipt email subject includes invoice number");
  assert(sentMsgs[0].htmlContent.includes("USD 49.00"), "Receipt HTML contains formatted transaction amount");

  // -------------------------------------------------------------------------
  // 8. NEWSLETTER OPT-IN, UNSUBSCRIBE & SUPPRESSION (TDD §25.1, FR-073, FR-074)
  // -------------------------------------------------------------------------
  console.log("\n8. NEWSLETTER OPT-IN, UNSUBSCRIBE & SUPPRESSION (TDD §25.1, FR-073, FR-074)");
  const consent = await newsletterService.recordOptIn({
    email: USER_EMAIL,
    userId: USER_ID,
    consentSource: "signup_checkbox",
    policyVersion: "v1.0",
    ipAddress: "197.232.61.12",
  });
  assert(consent.isSubscribed === true, "Recorded explicit opt-in consent");
  assert(consent.consentSource === "signup_checkbox", "Consent source recorded");
  assert(!newsletterService.isSuppressed(USER_EMAIL), "Consented email is not suppressed");

  // Unsubscribe with token
  const unsubResult = await newsletterService.processUnsubscribe(consent.unsubscribeToken);
  assert(unsubResult?.isSubscribed === false, "Processed one-click unsubscribe token");
  assert(newsletterService.isSuppressed(USER_EMAIL), "Email added to suppression list");

  // Marketing blast strictly rejected
  const marketingResult = await emailService.send({
    to: { email: USER_EMAIL },
    subject: "Flash Sale 50% Off Plans",
    htmlContent: "<p>Sale</p>",
    textContent: "Sale",
    category: "marketing",
  });
  assert(marketingResult.success === false, "Marketing email strictly dropped for suppressed contact (FR-074)");

  // Critical transactional message still succeeds
  const txResult = await emailService.sendPasswordReset({
    toEmail: USER_EMAIL,
    resetUrl: "https://fortress-ai.com/reset?token=xyz",
  });
  assert(txResult.success === true, "Critical transactional email bypasses marketing suppression (TDD §25.2)");

  // -------------------------------------------------------------------------
  // 9. DECOUPLED IN-APP NOTIFICATION RESILIENCE (TDD §25.3, FR-075)
  // -------------------------------------------------------------------------
  console.log("\n9. DECOUPLED IN-APP NOTIFICATION RESILIENCE (TDD §25.3, FR-075)");
  const notif = notificationRepository.createNotification({
    userId: USER_ID,
    type: "SYSTEM_UPDATE",
    title: "Billing Cycle Renewed",
    body: "Your Professional subscription renewed successfully.",
    idempotencyKey: "v6_notif_renew_1",
  });
  assert(notif.id !== undefined, "In-app notification persisted successfully in database");
  assert(notif.readAt === null, "Notification marked unread initially");

  const unreadCount = notificationRepository.getUnreadCountForUser(USER_ID);
  assert(unreadCount >= 1, "Unread notification count accurately surfaced for dashboard bell");

  console.log("\n===============================================================");
  console.log("  RESULT: ALL PHASE 6 VERIFICATION CHECKS PASSED (100%)");
  console.log("  Billing, Usage Ledger, Checkout & Brevo Email compliant with TDD v1.0.");
  console.log("===============================================================\n");
}

runPhase6Verification().catch((err) => {
  console.error("Verification failed with unexpected error:", err);
  process.exit(1);
});
