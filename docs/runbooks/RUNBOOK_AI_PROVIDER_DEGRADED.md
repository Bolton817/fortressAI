# Incident Runbook: AI Provider Degraded or Unavailable

**Severity**: SEV-2 / High  
**Trigger**: Gemini API returns 503 / 429 rate limit spikes, generation latency exceeds 30 seconds, or health probe `/api/health` reports `aiProvider: degraded/unhealthy`.  
**TDD Reference**: §35.3 (Row 1), FR-088, FR-089

---

## 1. Initial Assessment (First 5 Minutes)
1. Check `/api/health` status and inspect `subsystems.aiProvider.latencyMs`.
2. Inspect operational telemetry via `/api/admin/overview`:
   - Note active generation jobs in queue.
   - Check error rate and failure codes.
3. Verify external status page for Google Gemini API.

---

## 2. Immediate Mitigation & Customer Protection
1. **Throttle New Work**:
   - The platform workflow engine automatically holds pending generation jobs in durable state rather than failing permanently.
   - Client displays graceful retryable status: *"AI generation engine is experiencing high regional load. Your build progress is safely saved and will resume momentarily."*
2. **Prevent Double Debits (FR-070)**:
   - Ensure `usageCreditRepository` debits are guarded by idempotency keys.
   - If an AI generation job fails mid-flight, automatic credit refund executes via `usageCreditRepository.recordRefund()`.

---

## 3. Recovery & Reconciliation
1. Once provider recovers, unpause background queue workers at a throttled concurrency (2 concurrent jobs).
2. Reconcile provider spend against internal credits ledger.
3. Conduct post-incident review if outage lasted > 15 minutes.
