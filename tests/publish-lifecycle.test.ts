import { describe, it, expect, beforeEach } from "vitest";
import { PublishOrchestrator } from "@/core/publish/publish-orchestrator";
import { RollbackService } from "@/core/publish/rollback-service";
import { tenantRepository } from "@/db/tenant-repository";
import { releaseRepository } from "@/db/release-repository";
import { auditRepository } from "@/db/audit-repository";
import { notificationRepository } from "@/db/notification-repository";
import {
  seedPhase0Tenants,
  USER_A_ID,
  SITE_A_ID,
  USER_B_ID,
  SITE_B_ID,
  maraHorizonConfig,
} from "@/db/seed-data";
import { ValidationError, ResourceNotFoundError } from "@/core/errors";

describe("Phase 4: Publish & Rollback Lifecycle (TDD §20, §33.3; FR-033, FR-035, FR-036)", () => {
  const userId = USER_A_ID;
  const siteId = SITE_A_ID;

  beforeEach(() => {
    tenantRepository.clearAll();
    releaseRepository.clearAll();
    auditRepository.clearAll();
    notificationRepository.clearAll();
    seedPhase0Tenants();
  });

  describe("Pre-Flight Validation (TDD §20.2 #38)", () => {
    it("rejects site configuration without a home page", () => {
      const invalidConfig = JSON.parse(JSON.stringify(maraHorizonConfig));
      invalidConfig.pages = invalidConfig.pages.filter(
        (p: any) => p.slug !== "home" && p.slug !== "/"
      );

      expect(() => PublishOrchestrator.validatePreFlight(invalidConfig)).toThrow(
        ValidationError
      );
    });

    it("rejects site configuration referencing an unknown section manifest", () => {
      const invalidConfig = JSON.parse(JSON.stringify(maraHorizonConfig));
      invalidConfig.pages[0].sections.push({
        instanceId: "unknown_123",
        sectionId: "non.existent.manifest",
        sectionVersion: "1.0.0",
        content: {},
      });

      expect(() => PublishOrchestrator.validatePreFlight(invalidConfig)).toThrow(
        ValidationError
      );
    });

    it("accepts valid canonical site configuration", () => {
      expect(() =>
        PublishOrchestrator.validatePreFlight(maraHorizonConfig)
      ).not.toThrow();
    });
  });

  describe("Atomic Publication (FR-035, TDD §20.2)", () => {
    it("creates an immutable Release record with monotonic releaseNumber and SHA-256 hash", async () => {
      const result = await PublishOrchestrator.publishSite(
        siteId,
        userId,
        "Initial live launch"
      );

      expect(result.release).toBeDefined();
      expect(result.release.releaseNumber).toBe(1);
      expect(result.release.publishedByUserId).toBe(userId);
      expect(result.release.commitMessage).toBe("Initial live launch");
      expect(result.release.artefactHash).toBeDefined();
      expect(result.release.artefactHash).toHaveLength(64); // SHA-256 hex string
      expect(result.release.healthStatus).toBe("healthy");
      expect(result.release.sitemapXml).toContain("<urlset");
      expect(result.release.robotsTxt).toContain("User-agent: *");
    });

    it("atomically updates site publishedReleaseId and lifecycleStatus", async () => {
      const initialSite = tenantRepository.getSiteDirect(siteId)!;
      expect(initialSite.publishedReleaseId).toBeUndefined();

      const result = await PublishOrchestrator.publishSite(siteId, userId);

      const updatedSite = tenantRepository.getSiteDirect(siteId)!;
      expect(updatedSite.publishedReleaseId).toBe(result.release.id);
      expect(updatedSite.lifecycleStatus).toBe("published");
    });

    it("records a non-repudiable audit event and tenant notification on publish", async () => {
      const result = await PublishOrchestrator.publishSite(siteId, userId);

      // Audit event
      const auditEvents = auditRepository.listEvents({ targetType: "site", targetId: siteId });
      const publishEvent = auditEvents.find((e) => e.action === "site.publish");
      expect(publishEvent).toBeDefined();
      expect(publishEvent?.actorUserId).toBe(userId);
      expect(publishEvent?.metadata?.releaseId).toBe(result.release.id);

      // In-app notification
      const notifications = notificationRepository.listForUser(userId);
      const buildNotification = notifications.find((n) => n.type === "BUILD_SUCCEEDED");
      expect(buildNotification).toBeDefined();
      expect(buildNotification?.title).toContain("Website Published");
    });

    it("creates sequential immutable releases on subsequent publishes", async () => {
      const res1 = await PublishOrchestrator.publishSite(siteId, userId, "Release 1");
      const res2 = await PublishOrchestrator.publishSite(siteId, userId, "Release 2");

      expect(res1.release.releaseNumber).toBe(1);
      expect(res2.release.releaseNumber).toBe(2);

      const allReleases = releaseRepository.listReleasesForSite(siteId);
      expect(allReleases).toHaveLength(2);
      expect(allReleases[0].id).toBe(res2.release.id); // sorted desc
      expect(allReleases[1].id).toBe(res1.release.id);

      const site = tenantRepository.getSiteDirect(siteId)!;
      expect(site.publishedReleaseId).toBe(res2.release.id);
    });
  });

  describe("Instant Rollback Engine (FR-036, TDD §33.3)", () => {
    it("rolls back atomically to a prior release and preserves all historical releases", async () => {
      const res1 = await PublishOrchestrator.publishSite(siteId, userId, "V1");
      const res2 = await PublishOrchestrator.publishSite(siteId, userId, "V2");

      const siteBefore = tenantRepository.getSiteDirect(siteId)!;
      expect(siteBefore.publishedReleaseId).toBe(res2.release.id);

      // Rollback to Release 1
      const rollbackResult = await RollbackService.rollbackSite(
        siteId,
        res1.release.id,
        userId
      );

      expect(rollbackResult.restoredRelease.id).toBe(res1.release.id);
      expect(rollbackResult.restoredRelease.releaseNumber).toBe(1);
      expect(rollbackResult.fromReleaseId).toBe(res2.release.id);

      // Verify site pointer was atomically swapped
      const siteAfter = tenantRepository.getSiteDirect(siteId)!;
      expect(siteAfter.publishedReleaseId).toBe(res1.release.id);

      // Invariant: Release 2 was NOT deleted or erased
      const allReleases = releaseRepository.listReleasesForSite(siteId);
      expect(allReleases).toHaveLength(2);
      expect(allReleases.some((r) => r.id === res2.release.id)).toBe(true);

      // Audit log records rollback
      const auditEvents = auditRepository.listEvents({ targetType: "site", targetId: siteId });
      const rollbackEvent = auditEvents.find((e) => e.action === "site.rollback");
      expect(rollbackEvent).toBeDefined();
      expect(rollbackEvent?.metadata?.fromReleaseId).toBe(res2.release.id);
      expect(rollbackEvent?.metadata?.toReleaseId).toBe(res1.release.id);
    });

    it("rejects rollback if target release is already the active release", async () => {
      const res = await PublishOrchestrator.publishSite(siteId, userId, "V1");

      await expect(
        RollbackService.rollbackSite(siteId, res.release.id, userId)
      ).rejects.toThrow(ValidationError);
    });

    it("rejects rollback if target release belongs to another site", async () => {
      const otherSiteId = SITE_B_ID;
      const otherRes = await PublishOrchestrator.publishSite(
        otherSiteId,
        USER_B_ID,
        "Restaurant V1"
      );

      await expect(
        RollbackService.rollbackSite(siteId, otherRes.release.id, userId)
      ).rejects.toThrow(ResourceNotFoundError);
    });
  });
});
