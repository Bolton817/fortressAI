import { webhookEventRepository } from "@/db/webhook-event-repository";
import { subscriptionRepository, StoredSubscription } from "@/db/subscription-repository";
import { invoiceRepository, StoredInvoice, InvoiceLineItem } from "@/db/invoice-repository";
import { auditRepository } from "@/db/audit-repository";
import { notificationRepository } from "@/db/notification-repository";
import { PaymentAdapter, NormalizedWebhookEvent } from "./payment-adapter";
import { mockPaymentAdapter } from "./mock-payment-adapter";
import { intasendAdapter } from "./intasend-adapter";
import { PlanCatalog } from "./plan-catalog";

/**
 * Fortress AI — Payment Webhook Processing Engine (TDD §24.2, §27.2, FR-068, FR-071, FR-077)
 * Invariants:
 * - Browser redirect is never payment authority; verified webhook is required.
 * - Strict idempotency: Repeated webhooks must never trigger duplicate activations or invoices.
 * - Out-of-order and failed events are safely handled.
 */

export interface WebhookProcessingResult {
  success: boolean;
  isDuplicate: boolean;
  status: "processed" | "already_processed" | "ignored" | "failed";
  subscription?: StoredSubscription;
  invoice?: StoredInvoice;
  error?: string;
}

export class WebhookProcessor {
  private adapters: Map<string, PaymentAdapter> = new Map();

  constructor() {
    this.registerAdapter(mockPaymentAdapter);
    this.registerAdapter(intasendAdapter);
  }

  registerAdapter(adapter: PaymentAdapter) {
    this.adapters.set(adapter.providerName.toLowerCase(), adapter);
  }

  getAdapter(providerName: string): PaymentAdapter | null {
    return this.adapters.get(providerName.toLowerCase()) || null;
  }

  /**
   * Main entry point for ingesting and fulfilling payment webhooks.
   */
  async processWebhook(params: {
    providerName: string;
    rawBody: string;
    signature: string;
    secret?: string;
  }): Promise<WebhookProcessingResult> {
    const adapter = this.getAdapter(params.providerName);
    if (!adapter) {
      return {
        success: false,
        isDuplicate: false,
        status: "failed",
        error: `Unsupported payment provider: ${params.providerName}`,
      };
    }

    // 1. Cryptographic Signature Verification (FR-068)
    const isValidSignature = adapter.verifyWebhookSignature(
      params.rawBody,
      params.signature,
      params.secret
    );

    if (!isValidSignature) {
      return {
        success: false,
        isDuplicate: false,
        status: "failed",
        error: "Invalid or forged webhook signature. Webhook rejected.",
      };
    }

    // 2. Parse event payload
    let event: NormalizedWebhookEvent;
    try {
      event = adapter.parseWebhookEvent(params.rawBody);
    } catch (err: any) {
      return {
        success: false,
        isDuplicate: false,
        status: "failed",
        error: `Failed to parse webhook JSON payload: ${err.message}`,
      };
    }

    // 3. Deduplication Guard: Check provider event ID in database (FR-068, FR-077)
    const recordResult = webhookEventRepository.recordEvent({
      provider: event.provider,
      providerEventId: event.providerEventId,
      eventType: event.eventType,
      payloadJson: event.rawPayload,
      signature: params.signature,
      status: "processed",
    });

    if (recordResult.isDuplicate) {
      // Return HTTP 200 equivalent without duplicate fulfillment!
      return {
        success: true,
        isDuplicate: true,
        status: "already_processed",
      };
    }

    // 4. State Transition & Fulfillment
    try {
      if (event.eventType === "checkout.completed" || event.eventType === "subscription.renewed") {
        const plan = PlanCatalog.getPlan(event.planId || "starter");
        const interval = event.billingInterval || "monthly";
        const durationDays = interval === "annual" ? 365 : 30;

        // A. Subscription creation or renewal
        let sub = subscriptionRepository.getActiveSubscriptionForUser(event.userId);
        if (sub) {
          sub = subscriptionRepository.renewSubscription(sub.id, durationDays);
          if (sub && event.planId && sub.planId !== event.planId) {
            sub = subscriptionRepository.updateSubscription(sub.id, {
              planId: event.planId,
              billingInterval: interval,
            });
          }
        } else {
          sub = subscriptionRepository.createSubscription({
            userId: event.userId,
            planId: plan.id,
            billingInterval: interval,
            currency: event.currency,
            durationDays,
            providerSubscriptionId: event.providerSubscriptionId,
            paymentMethodType: event.paymentMethodType,
            paymentMethodDetails: event.paymentMethodDetails,
            status: "active",
          });
        }

        // B. Immutable Invoice & Receipt generation (FR-071)
        const lineItems: InvoiceLineItem[] = event.lineItems || [
          {
            description: `${plan.name} (${interval === "annual" ? "Annual" : "Monthly"})`,
            amountMinorUnits: event.amountMinorUnits,
            quantity: 1,
            category: "subscription",
          },
        ];

        const invoice = invoiceRepository.createInvoice({
          userId: event.userId,
          subscriptionId: sub?.id,
          amountMinorUnits: event.amountMinorUnits,
          currency: event.currency,
          lineItems,
          providerPaymentId: event.providerPaymentId,
          idempotencyKey: event.idempotencyKey || `inv_idemp_${event.providerEventId}`,
          status: "paid",
        });

        // C. Audit Trail & In-App Notification (FR-075)
        auditRepository.recordEvent({
          actorUserId: event.userId,
          action: "billing.payment_received",
          targetType: "user",
          targetId: event.userId,
          metadataJson: {
            provider: event.provider,
            providerPaymentId: event.providerPaymentId,
            amountMinorUnits: event.amountMinorUnits,
            currency: event.currency,
            invoiceNumber: invoice.invoiceNumber,
          },
        });

        notificationRepository.createNotification({
          userId: event.userId,
          type: "SYSTEM_UPDATE",
          title: "Payment Received & Subscription Active",
          body: `Thank you for your payment! Your ${plan.name} subscription is now active. Receipt ${invoice.invoiceNumber} is available in your billing history.`,
          targetRoute: "/dashboard/billing",
          idempotencyKey: `notif_pay_${event.providerEventId}`,
        });

        return {
          success: true,
          isDuplicate: false,
          status: "processed",
          subscription: sub || undefined,
          invoice,
        };
      } else if (event.eventType === "payment.failed") {
        // Failed payment enters past_due grace period (TDD §24.4)
        const sub = subscriptionRepository.getActiveSubscriptionForUser(event.userId);
        if (sub) {
          subscriptionRepository.updateSubscription(sub.id, {
            status: "past_due",
          });
        }

        notificationRepository.createNotification({
          userId: event.userId,
          type: "SECURITY_ALERT",
          title: "Payment Failed — Grace Period Active",
          body: "We were unable to process your subscription renewal. Your sites remain active during the grace period. Please update your payment method.",
          targetRoute: "/dashboard/billing",
          idempotencyKey: `notif_pay_fail_${event.providerEventId}`,
        });

        return {
          success: true,
          isDuplicate: false,
          status: "processed",
        };
      }

      return {
        success: true,
        isDuplicate: false,
        status: "ignored",
      };
    } catch (err: any) {
      webhookEventRepository.markFailed(recordResult.event.id, err.message);
      return {
        success: false,
        isDuplicate: false,
        status: "failed",
        error: `Webhook fulfillment error: ${err.message}`,
      };
    }
  }
}

export const webhookProcessor = new WebhookProcessor();
