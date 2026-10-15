# Incident Runbook: Custom Domain Mapping Conflict or Takeover Attempt

**Severity**: SEV-1 / Critical  
**Trigger**: A custom domain resolves to the wrong tenant site, customer reports domain mapping anomaly, or security audit logs multiple registration attempts for an active hostname.  
**TDD Reference**: §35.3 (Row 3), FR-064, FR-086

---

## 1. Initial Assessment (First 5 Minutes)
1. Query audit log history for domain:
   ```ts
   auditService.reconstructLifecycle(domainName);
   ```
2. Verify domain status in `DomainRepository`: inspect `siteId`, `verificationStatus`, and DNS challenge tokens.
3. Query authoritative public DNS:
   - Check CNAME pointing to `ingress.fortressai.app`.
   - Check TXT verification record `_fortress-verification.<domain>`.

---

## 2. Immediate Mitigation
1. **Disable Affected Hostname Mapping**:
   - Immediately decouple the active mapping pointer to route requests to a secure 404 or domain verification holding page.
2. **Invalidate Edge Routing Caches**:
   - Invalidate routing cache in `CacheManager` to eliminate stale resolution.
3. **Audit Ownership Evidence**:
   - Confirm ownership: the legitimate tenant must demonstrate control via a fresh random TXT verification challenge.
   - Any malicious tenant attempting hijacking is suspended via `UserRepository.updateUserStatus(userId, "suspended")`.

---

## 3. Recovery & Notification
1. Re-attach domain cleanly to verified site owner.
2. Emit formal audit event `domain.takeover_mitigated`.
3. Notify affected tenant with root cause summary.
