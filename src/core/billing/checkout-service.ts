import { randomUUID } from "node:crypto";
import { PaymentAdapter, CheckoutSessionInput, CheckoutSessionResult } from "./payment-adapter";
import { mockPaymentAdapter } from "./mock-payment-adapter";
import { intasendAdapter } from "./intasend-adapter";
import { PlanCatalog } from "./plan-catalog";

/**
 * Fortress AI — Checkout Orchestration Service (TDD §24.2, FR-067)
 * Invariants:
 * - Server is strictly authoritative for price calculation.
 * - Client-submitted price is ignored.
 * - Repeated clicks with same idempotency key are safely handled.
 */

export class CheckoutService {
  private adapters: Map<string, PaymentAdapter> = new Map();
  private defaultAdapter: PaymentAdapter;

  constructor(defaultAdapter?: PaymentAdapter) {
    this.defaultAdapter = defaultAdapter || mockPaymentAdapter;
    this.registerAdapter(mockPaymentAdapter);
    this.registerAdapter(intasendAdapter);
  }

  registerAdapter(adapter: PaymentAdapter) {
    this.adapters.set(adapter.providerName.toLowerCase(), adapter);
  }

  getAdapter(providerName?: string): PaymentAdapter {
    if (!providerName) return this.defaultAdapter;
    return this.adapters.get(providerName.toLowerCase()) || this.defaultAdapter;
  }

  /**
   * Creates an immutable server-priced checkout session.
   * Client amounts are never trusted (FR-067).
   */
  async createCheckout(input: {
    userId: string;
    customerEmail: string;
    customerName?: string;
    customerPhone?: string;
    planId: string;
    billingInterval?: "monthly" | "annual";
    currency?: "USD" | "KES";
    provider?: "mock" | "intasend";
    domainOrderItems?: Array<{
      domainName: string;
      termYears: number;
      priceCents: number;
    }>;
    successUrl?: string;
    cancelUrl?: string;
    idempotencyKey?: string;
  }): Promise<CheckoutSessionResult> {
    const interval = input.billingInterval || "monthly";
    const currency = input.currency || (input.provider === "intasend" ? "KES" : "USD");
    const idempotencyKey = input.idempotencyKey || `chk_idemp_${randomUUID()}`;

    // Select provider adapter
    let adapter = this.getAdapter(input.provider);
    if (!input.provider && currency === "KES") {
      adapter = this.getAdapter("intasend");
    }

    const sessionInput: CheckoutSessionInput = {
      userId: input.userId,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      planId: input.planId,
      billingInterval: interval,
      currency,
      domainOrderItems: input.domainOrderItems,
      successUrl: input.successUrl || "/dashboard/billing?status=success",
      cancelUrl: input.cancelUrl || "/dashboard/billing?status=cancelled",
      idempotencyKey,
    };

    return adapter.createCheckoutSession(sessionInput);
  }
}

export const checkoutService = new CheckoutService();
