import { createHmac, randomUUID } from "node:crypto";
import {
  PaymentAdapter,
  CheckoutSessionInput,
  CheckoutSessionResult,
  NormalizedWebhookEvent,
  CheckoutLineItem,
} from "./payment-adapter";
import { PlanCatalog } from "./plan-catalog";

/**
 * Fortress AI — Mock Payment Provider Adapter (TDD §24.2, §24.5, FR-067, FR-068)
 * Deterministic payment simulator for automated testing and CI.
 */

export class MockPaymentAdapter implements PaymentAdapter {
  public readonly providerName = "mock";
  private webhookSecret: string = "test_webhook_secret_key_123456";
  private sessions: Map<string, CheckoutSessionResult> = new Map();
  private payments: Map<string, { status: string; amount: number }> = new Map();

  constructor(secret?: string) {
    if (secret) this.webhookSecret = secret;
  }

  setWebhookSecret(secret: string) {
    this.webhookSecret = secret;
  }

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    // 1. Calculate price authoritatively from server catalog (FR-067)
    const planPrice = PlanCatalog.calculatePrice(
      input.planId,
      input.billingInterval,
      input.currency
    );

    const plan = PlanCatalog.getPlan(input.planId);
    const lineItems: CheckoutLineItem[] = [
      {
        description: `${plan.name} (${input.billingInterval === "annual" ? "Annual" : "Monthly"})`,
        amountMinorUnits: planPrice.amountMinorUnits,
        quantity: 1,
        category: "subscription",
      },
    ];

    let totalAmount = planPrice.amountMinorUnits;

    // Add optional domain items
    if (input.domainOrderItems && input.domainOrderItems.length > 0) {
      for (const d of input.domainOrderItems) {
        lineItems.push({
          description: `Domain Registration: ${d.domainName} (${d.termYears} yr)`,
          amountMinorUnits: d.priceCents,
          quantity: 1,
          category: "domain",
        });
        totalAmount += d.priceCents;
      }
    }

    const sessionId = `mock_sess_${randomUUID()}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const checkoutUrl = `/checkout/mock/${sessionId}?amount=${totalAmount}&currency=${input.currency}`;

    const result: CheckoutSessionResult = {
      sessionId,
      provider: this.providerName,
      checkoutUrl,
      amountMinorUnits: totalAmount,
      currency: input.currency,
      lineItems,
      idempotencyKey: input.idempotencyKey,
      expiresAt,
    };

    this.sessions.set(sessionId, result);
    this.payments.set(sessionId, { status: "pending", amount: totalAmount });
    return result;
  }

  verifyWebhookSignature(rawBody: string, signature: string, secret?: string): boolean {
    const key = secret || this.webhookSecret;
    const expected = createHmac("sha256", key).update(rawBody).digest("hex");
    return expected === signature;
  }

  signPayload(rawBody: string, secret?: string): string {
    const key = secret || this.webhookSecret;
    return createHmac("sha256", key).update(rawBody).digest("hex");
  }

  parseWebhookEvent(rawBody: string): NormalizedWebhookEvent {
    const data = JSON.parse(rawBody) as Record<string, unknown>;
    return {
      provider: (data.provider as string) || this.providerName,
      providerEventId: (data.providerEventId as string) || `evt_${randomUUID()}`,
      eventType: (data.eventType as any) || "checkout.completed",
      userId: data.userId as string,
      planId: data.planId as string,
      billingInterval: (data.billingInterval as any) || "monthly",
      amountMinorUnits: Number(data.amountMinorUnits || 0),
      currency: (data.currency as string) || "USD",
      providerPaymentId: (data.providerPaymentId as string) || `pay_${randomUUID()}`,
      providerSubscriptionId: data.providerSubscriptionId as string | undefined,
      paymentMethodType: (data.paymentMethodType as any) || "card",
      paymentMethodDetails: data.paymentMethodDetails as any || {
        brand: "Visa",
        last4: "4242",
      },
      lineItems: data.lineItems as any,
      idempotencyKey: data.idempotencyKey as string | undefined,
      rawPayload: data,
    };
  }

  async getPaymentStatus(providerPaymentId: string): Promise<{
    isPaid: boolean;
    status: string;
    amountMinorUnits: number;
  }> {
    const p = this.payments.get(providerPaymentId);
    if (!p) {
      return { isPaid: false, status: "not_found", amountMinorUnits: 0 };
    }
    return {
      isPaid: p.status === "completed" || p.status === "paid",
      status: p.status,
      amountMinorUnits: p.amount,
    };
  }

  async refundPayment(
    providerPaymentId: string,
    _amountMinorUnits: number,
    _reason: string
  ): Promise<{ success: boolean; refundId?: string }> {
    const p = this.payments.get(providerPaymentId);
    if (p) {
      p.status = "refunded";
    }
    return { success: true, refundId: `ref_${randomUUID()}` };
  }

  /**
   * Helper for tests: simulates a signed webhook payload
   */
  createTestWebhook(params: {
    providerEventId?: string;
    eventType?: string;
    userId: string;
    planId: string;
    billingInterval?: "monthly" | "annual";
    amountMinorUnits: number;
    currency?: string;
    providerPaymentId?: string;
    idempotencyKey?: string;
  }): { payload: string; signature: string } {
    const data = {
      provider: this.providerName,
      providerEventId: params.providerEventId || `evt_${randomUUID()}`,
      eventType: params.eventType || "checkout.completed",
      userId: params.userId,
      planId: params.planId,
      billingInterval: params.billingInterval || "monthly",
      amountMinorUnits: params.amountMinorUnits,
      currency: params.currency || "USD",
      providerPaymentId: params.providerPaymentId || `pay_${randomUUID()}`,
      idempotencyKey: params.idempotencyKey,
      paymentMethodType: "card",
      paymentMethodDetails: { brand: "Visa", last4: "4242" },
      timestamp: new Date().toISOString(),
    };

    const payload = JSON.stringify(data);
    const signature = this.signPayload(payload);
    return { payload, signature };
  }

  clear() {
    this.sessions.clear();
    this.payments.clear();
  }
}

export const mockPaymentAdapter = new MockPaymentAdapter();
