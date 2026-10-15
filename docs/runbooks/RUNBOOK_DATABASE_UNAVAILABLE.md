# Incident Runbook: Database & Storage Unavailable

**Severity**: SEV-1 / Critical  
**Trigger**: Read/write operations to `.data/` fail, EACCES/ENOSPC filesystem errors, or health probe `/api/health` returns `storage: unhealthy`.  
**TDD Reference**: §35.3 (Row 2), FR-085, FR-089

---

## 1. Initial Assessment (First 5 Minutes)
1. Verify `/api/health` status and inspect `subsystems.storage.message`.
2. Inspect server disk volume utilization (`df -h` / PowerShell `Get-PSDrive`).
3. Confirm if edge/cached static routes remain live (immutable static releases and exported bundles should remain accessible even during database degradation).

---

## 2. Immediate Mitigation
1. **Disable Risky Schema Migrations**:
   - Immediately abort any in-progress migrations or file sync operations.
2. **Read-Only Failover**:
   - Serve cached public site releases using in-memory release repository snapshots (`ReleaseRepository.cache`).
   - Block new user registrations and credit purchases gracefully with a maintenance notice.

---

## 3. Disaster Recovery (FR-085)
1. If file corruption or accidental deletion occurred:
   - Locate the latest automated snapshot in `.data/backups/`.
   - Run disaster recovery drill verification via `RecoveryService.executeRestoreDrill()`.
   - Restore point-in-time snapshot within target RTO (< 8 hours).
2. Verify integrity of all customer sites and user accounts.
