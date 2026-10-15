# Incident Runbook: Payment Succeeded but Fulfillment Failed (Orphan Reconciliation)

**Severity**: SEV-2 / High  
**Trigger**: Payment gateway (IntaSend / Stripe / M-Pesa) webhook reports `status: "paid"` but subscription activation, domain order, or usage credit grant failed or timed out.  
**TDD Reference**: §35.3 (Row 4), FR-069, FR-071, FR-086

---

## 1. Initial Assessment (First 5 Minutes)
1. Search `webhook-event-repository.ts` for the provider transaction ID:
   ```ts
   webhookEventRepository.getByProviderEventId(providerEventId);
   ```
2. Verify idempotency index in `InvoiceRepository`:
   - Confirm whether an invoice was generated or if duplicate attempts were blocked.
3. Check `SubscriptionRepository` or `DomainOrderRepository` for matched customer record.

---

## 2. Idempotent Recovery
1. Re-run webhook fulfillment through `WebhookProcessor.processVerifiedWebhook(event)`:
   - Invariant: Because fulfillment operations are strictly idempotent, replaying a verified event NEVER double-bills or generates duplicate invoice numbers.
2. If registrar or external service experienced downstream rejection:
   - Provide customer credit or issue automated refund via `auditService.logRefund()`.
   - Dispatch transaction failure notification to customer.

---

## 3. Communication
1. Notify customer via Brevo transactional receipt: confirm plan activation or explain refund timeline.
