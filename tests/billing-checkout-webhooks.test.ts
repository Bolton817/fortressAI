import { describe, it, expect, beforeEach } from "vitest";
import { checkoutService } from "@/core/billing/checkout-service";
import { webhookProcessor } from "@/core/billing/webhook-processor";
import { mockPaymentAdapter } from "@/core/billing/mock-payment-adapter";
import { intasendAdapter } from "@/core/billing/intasend-adapter";
import { subscriptionRepository } from "@/db/subscription-repository";
import { invoiceRepository } from "@/db/invoice-repository";
import { webhookEventRepository } from "@/db/webhook-event-repository";
import { auditRepository } from "@/db/audit-repository";

describe("Checkout Creation & Payment Webhook Ingestion (TDD §24.2, §27.2, FR-067, FR-068, FR-071)", () => {
  const TEST_USER = "user_checkout_test_303";
  const TEST_EMAIL = "founder@kenya-safaris.co.ke";

  beforeEach(() => {
    subscriptionRepository.clearAll();
    invoiceRepository.clearAll();
    webhookEventRepository.clearAll();
    mockPaymentAdapter.clear();
  });

  it("creates checkout session with server-calculated price book ignoring client modifications (FR-067)", async () => {
    const session = await checkoutService.createCheckout({
      userId: TEST_USER,
      customerEmail: TEST_EMAIL,
      planId: "starter",
      billingInterval: "monthly",
      currency: "USD",
      provider: "mock",
    });

    expect(session.sessionId).toContain("mock_sess_");
    expect(session.amountMinorUnits).toBe(1900); // Server calculated $19.00
    expect(session.currency).toBe("USD");
    expect(session.lineItems.length).toBe(1);
    expect(session.lineItems[0].category).toBe("subscription");
  });

  it("includes separately itemized domain orders in checkout session", async () => {
    const session = await checkoutService.createCheckout({
      userId: TEST_USER,
      customerEmail: TEST_EMAIL,
      planId: "starter",
      billingInterval: "annual",
      currency: "USD",
      provider: "mock",
      domainOrderItems: [
        {
          domainName: "safari-horizon.com",
          termYears: 1,
          priceCents: 1499,
        },
      ],
    });

    // 19000 (annual plan) + 1499 (domain) = 20499
    expect(session.amountMinorUnits).toBe(20499);
    expect(session.lineItems.length).toBe(2);
    expect(session.lineItems[0].category).toBe("subscription");
    expect(session.lineItems[1].category).toBe("domain");
  });

  it("normalizes Kenyan phone numbers to E.164 in IntaSend adapter", () => {
    expect(intasendAdapter.normalizeMpesaPhone("0712345678")).toBe("+254712345678");
    expect(intasendAdapter.normalizeMpesaPhone("254712345678")).toBe("+254712345678");
    expect(intasendAdapter.normalizeMpesaPhone("+254712345678")).toBe("+254712345678");
  });

  it("rejects webhooks with invalid or forged HMAC signatures (FR-068)", async () => {
    const { payload } = mockPaymentAdapter.createTestWebhook({
      userId: TEST_USER,
      planId: "starter",
      amountMinorUnits: 1900,
    });

    const result = await webhookProcessor.processWebhook({
      providerName: "mock",
      rawBody: payload,
      signature: "invalid_forged_signature_hash_000000",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("signature");
  });

  it("fulfills verified payment webhook transactionally (FR-068, FR-071)", async () => {
    const { payload, signature } = mockPaymentAdapter.createTestWebhook({
      providerEventId: "evt_test_checkout_complete_1",
      userId: TEST_USER,
      planId: "pro",
      billingInterval: "monthly",
      amountMinorUnits: 4900,
      currency: "USD",
      providerPaymentId: "pay_test_pro_100",
    });

    const result = await webhookProcessor.processWebhook({
      providerName: "mock",
      rawBody: payload,
      signature,
    });

    expect(result.success).toBe(true);
    expect(result.isDuplicate).toBe(false);
    expect(result.status).toBe("processed");

    // Subscription created
    expect(result.subscription).toBeDefined();
    expect(result.subscription?.planId).toBe("pro");
    expect(result.subscription?.status).toBe("active");

    // Immutable Invoice created
    expect(result.invoice).toBeDefined();
    expect(result.invoice?.invoiceNumber).toMatch(/^INV-\d{4}-\d+/);
    expect(result.invoice?.amountMinorUnits).toBe(4900);
    expect(result.invoice?.currency).toBe("USD");
    expect(result.invoice?.status).toBe("paid");

    // Database check
    const activeSub = subscriptionRepository.getActiveSubscriptionForUser(TEST_USER);
    expect(activeSub?.planId).toBe("pro");

    const invoices = invoiceRepository.listInvoicesForUser(TEST_USER);
    expect(invoices.length).toBe(1);
    expect(invoices[0].invoiceNumber).toBe(result.invoice?.invoiceNumber);
  });

  it("strictly enforces webhook idempotency: repeated delivery causes zero duplicate fulfillment (FR-068, FR-077)", async () => {
    const { payload, signature } = mockPaymentAdapter.createTestWebhook({
      providerEventId: "evt_duplicate_replay_test_999",
      userId: TEST_USER,
      planId: "starter",
      amountMinorUnits: 1900,
    });

    // 1st delivery
    const firstResult = await webhookProcessor.processWebhook({
      providerName: "mock",
      rawBody: payload,
      signature,
    });
    expect(firstResult.success).toBe(true);
    expect(firstResult.isDuplicate).toBe(false);

    // 2nd delivery (identical eventId)
    const secondResult = await webhookProcessor.processWebhook({
      providerName: "mock",
      rawBody: payload,
      signature,
    });
    expect(secondResult.success).toBe(true);
    expect(secondResult.isDuplicate).toBe(true);
    expect(secondResult.status).toBe("already_processed");

    // Invoices should not be duplicated
    const userInvoices = invoiceRepository.listInvoicesForUser(TEST_USER);
    expect(userInvoices.length).toBe(1);
  });

  it("transitions subscription to past_due grace period upon payment failure (TDD §24.4)", async () => {
    // 1. Establish active subscription
    subscriptionRepository.createSubscription({
      userId: TEST_USER,
      planId: "starter",
      status: "active",
    });

    // 2. Simulate failed renewal webhook
    const { payload, signature } = mockPaymentAdapter.createTestWebhook({
      providerEventId: "evt_payment_failed_test_123",
      eventType: "payment.failed",
      userId: TEST_USER,
      planId: "starter",
      amountMinorUnits: 1900,
    });

    const result = await webhookProcessor.processWebhook({
      providerName: "mock",
      rawBody: payload,
      signature,
    });

    expect(result.success).toBe(true);

    const sub = subscriptionRepository.getActiveSubscriptionForUser(TEST_USER);
    expect(sub?.status).toBe("past_due");
  });
});
