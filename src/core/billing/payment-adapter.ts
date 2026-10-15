/**
 * Fortress AI — Standardized Payment Provider Adapter Interface (TDD §24.2, §24.5, FR-067, FR-068)
 * Standard abstraction over payment gateways (IntaSend, Stripe, Mock).
 */

export interface CheckoutLineItem {
  description: string;
  amountMinorUnits: number;
  quantity: number;
  category: "subscription" | "domain" | "addon";
}

export interface CheckoutSessionInput {
  userId: string;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  planId: string;
  billingInterval: "monthly" | "annual";
  currency: "USD" | "KES";
  domainOrderItems?: Array<{
    domainName: string;
    termYears: number;
    priceCents: number;
  }>;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  provider: string;
  checkoutUrl: string;
  amountMinorUnits: number;
  currency: string;
  lineItems: CheckoutLineItem[];
  idempotencyKey: string;
  expiresAt: string;
}

export type NormalizedEventType =
  | "checkout.completed"
  | "subscription.renewed"
  | "payment.failed"
  | "refund.processed";

export interface NormalizedWebhookEvent {
  provider: string;
  providerEventId: string;
  eventType: NormalizedEventType;
  userId: string;
  planId?: string;
  billingInterval?: "monthly" | "annual";
  amountMinorUnits: number;
  currency: string;
  providerPaymentId: string;
  providerSubscriptionId?: string;
  paymentMethodType?: "card" | "mpesa";
  paymentMethodDetails?: {
    brand?: string;
    last4?: string;
    phone?: string;
  };
  lineItems?: CheckoutLineItem[];
  idempotencyKey?: string;
  rawPayload: Record<string, unknown>;
}

export interface PaymentAdapter {
  readonly providerName: string;

  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;

  verifyWebhookSignature(rawBody: string, signature: string, secret?: string): boolean;

  parseWebhookEvent(rawBody: string): NormalizedWebhookEvent;

  getPaymentStatus(providerPaymentId: string): Promise<{
    isPaid: boolean;
    status: string;
    amountMinorUnits: number;
  }>;

  refundPayment(
    providerPaymentId: string,
    amountMinorUnits: number,
    reason: string
  ): Promise<{ success: boolean; refundId?: string }>;
}
