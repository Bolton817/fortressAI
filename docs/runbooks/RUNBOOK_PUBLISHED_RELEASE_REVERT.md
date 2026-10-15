# Incident Runbook: Published Release Broken or Corrupted

**Severity**: SEV-2 / High  
**Trigger**: Live public website renders 500 errors, layout breaks, or missing critical sections after a publish event.  
**TDD Reference**: §20.4, §35.3 (Row 6), FR-034

---

## 1. Initial Assessment (First 2 Minutes)
1. Inspect live route using preview/public path: `GET /site/[slug]/`.
2. Retrieve release history via `releaseRepository.listReleasesForSite(siteId)`.
3. Identify the last known healthy release number ($N-1$).

---

## 2. Immediate Rollback Execution
1. Invoke atomic rollback via `RollbackService.rollbackToRelease(siteId, targetReleaseId, "Emergency post-publish defect")`:
   - Instantly repoints `site.publishedReleaseId` to the healthy release snapshot.
   - Clears edge route cache via `CacheManager.invalidateSite(siteId)`.
   - Records audit event `site.rollback` with reason.
2. Confirm live public site immediately serves healthy release within < 100ms.

---

## 3. Post-Incident Follow-Up
1. Preserve the broken release snapshot and configuration for offline debugging.
2. Run automated regression suite on the failing section variant.
