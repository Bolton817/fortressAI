import { tenantRepository } from "@/db/tenant-repository";
import { releaseRepository, StoredRelease } from "@/db/release-repository";
import { auditRepository } from "@/db/audit-repository";
import { notificationService } from "@/core/notifications/notification-service";
import { cacheManager } from "./cache-manager";
import { ResourceNotFoundError, ValidationError } from "@/core/errors";

/**
 * Fortress AI — Instant Rollback Service (TDD §33.3, FR-036)
 * Invariants:
 *  - Rollback is audited and does NOT erase newer releases.
 *  - Target release must be a valid, existing release of the specified site.
 *  - Atomic pointer redirection to the selected release snapshot.
 */

export interface RollbackResult {
  restoredRelease: StoredRelease;
  fromReleaseId?: string;
  durationMs: number;
}

export class RollbackService {
  public static async rollbackSite(
    siteId: string,
    targetReleaseId: string,
    actorUserId: string
  ): Promise<RollbackResult> {
    const startTime = Date.now();

    // 1. Fetch site
    const site = tenantRepository.getSiteDirect(siteId);
    if (!site || site.lifecycleStatus === "deleted") {
      throw new ResourceNotFoundError("Site", siteId);
    }

    const fromReleaseId = site.publishedReleaseId;

    // 2. Fetch target release and verify tenancy
    const targetRelease = releaseRepository.getRelease(targetReleaseId);
    if (!targetRelease || targetRelease.siteId !== siteId) {
      throw new ResourceNotFoundError("Release", targetReleaseId);
    }

    // 3. Ensure target is not already the active release
    if (fromReleaseId === targetReleaseId) {
      throw new ValidationError(
        `Release #${targetRelease.releaseNumber} is already the active published release.`
      );
    }

    // 4. Atomically swap publishedReleaseId to targetReleaseId (TDD §20.1)
    tenantRepository.updatePublishedRelease(siteId, targetRelease.id);

    // 5. Invalidate caches (TDD §20.4)
    cacheManager.invalidateSite(siteId);

    const durationMs = Date.now() - startTime;

    // 6. Record audit event (TDD §33.3, FR-036)
    auditRepository.record({
      actorUserId,
      action: "site.rollback",
      targetType: "site",
      targetId: siteId,
      metadata: {
        fromReleaseId,
        toReleaseId: targetRelease.id,
        restoredReleaseNumber: targetRelease.releaseNumber,
        durationMs,
      },
    });

    // 7. Dispatch notification
    notificationService.notifySiteRolledBack({
      userId: actorUserId,
      siteId,
      releaseNumber: targetRelease.releaseNumber,
      publishedUrl: `/site/${site.platformSlug}`,
    });

    return {
      restoredRelease: targetRelease,
      fromReleaseId,
      durationMs,
    };
  }
}
