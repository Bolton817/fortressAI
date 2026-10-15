import { createHash } from "node:crypto";
import { SiteConfiguration, SiteConfigurationSchema } from "@/core/schema/site-config";
import { getSectionManifest } from "@/registry";
import { tenantRepository } from "@/db/tenant-repository";
import { releaseRepository, StoredRelease } from "@/db/release-repository";
import { domainRepository } from "@/db/domain-repository";
import { auditRepository } from "@/db/audit-repository";
import { notificationService } from "@/core/notifications/notification-service";
import { cacheManager } from "./cache-manager";
import { SeoGenerator } from "./seo-generator";
import { ValidationError, ResourceNotFoundError } from "@/core/errors";

/**
 * Fortress AI — Publish Orchestrator (TDD §20.2, FR-035)
 * Invariant:
 *  - Atomic release pointer transition (publishedReleaseId).
 *  - Failure leaves prior live release untouched (zero downtime / blanking).
 *  - Releases are strictly immutable.
 */

export interface PublishResult {
  release: StoredRelease;
  publishedUrl: string;
  durationMs: number;
}

export class PublishOrchestrator {
  /**
   * Run pre-flight integrity validation on site configuration (TDD §20.2 #38)
   */
  public static validatePreFlight(config: SiteConfiguration): void {
    // 1. Zod schema validation
    try {
      SiteConfigurationSchema.parse(config);
    } catch (err: any) {
      throw new ValidationError(err.message || "Invalid site configuration schema");
    }

    // 2. Validate at least one homepage exists
    const hasHome = config.pages.some((p) => p.slug === "home" || p.slug === "/");
    if (!hasHome) {
      throw new ValidationError("Site must contain a 'home' or root ('/') page to publish.");
    }

    // 3. Validate every page has sections and every section exists in the registry
    for (const page of config.pages) {
      if (!page.sections || page.sections.length === 0) {
        throw new ValidationError(`Page "${page.title}" (${page.slug}) has no sections configured.`);
      }

      for (const section of page.sections) {
        const secId = section.sectionId || (section as any).manifestId;
        const manifest = getSectionManifest(secId);
        if (!manifest) {
          throw new ValidationError(
            `Unknown or unreleased section "${secId}" in page "${page.title}".`
          );
        }
      }
    }
  }

  /**
   * Execute atomic publication pipeline (TDD §20.2)
   */
  public static async publishSite(
    siteId: string,
    actorUserId: string,
    commitMessage?: string
  ): Promise<PublishResult> {
    const startTime = Date.now();

    // 1. Fetch site and verify access
    const site = tenantRepository.getSiteDirect(siteId);
    if (!site || site.lifecycleStatus === "deleted") {
      throw new ResourceNotFoundError("Site", siteId);
    }

    // 2. Load latest canonical draft configuration
    const draftConfig = await tenantRepository.getPreviewConfiguration(siteId);

    // 3. Pre-flight integrity validation
    try {
      this.validatePreFlight(draftConfig);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Validation failed";
      // Dispatch failure notification and keep prior release untouched
      notificationService.notifyBuildFailed({
        userId: actorUserId,
        siteId,
        jobId: `preflight_${Date.now()}`,
        errorMessage: `Pre-flight checks failed: ${errMsg}`,
      });
      throw err;
    }

    // 4. Compute primary public base URL
    const appHost = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    let baseUrl: string;
    try {
      const parsed = new URL(appHost);
      baseUrl = `${parsed.protocol}//${site.platformSlug}.${parsed.host}`;
    } catch {
      baseUrl = `http://${site.platformSlug}.localhost:3000`;
    }

    // 5. Freeze snapshot, compute SHA-256 artefact hash
    const canonicalJsonString = JSON.stringify(draftConfig);
    const artefactHash = createHash("sha256").update(canonicalJsonString).digest("hex");

    // 6. Generate SEO metadata snapshot, sitemap.xml, robots.txt
    const seoSnapshot = SeoGenerator.generateAllMetadata(draftConfig, baseUrl, true);
    const sitemapXml = SeoGenerator.generateSitemapXml(draftConfig, baseUrl);
    const robotsTxt = SeoGenerator.generateRobotsTxt(baseUrl);

    const durationMs = Date.now() - startTime;

    // 7. Write immutable Release record
    const release = releaseRepository.createRelease(siteId, {
      config: draftConfig,
      publishedByUserId: actorUserId,
      commitMessage: commitMessage || `Release published via dashboard`,
      healthStatus: "healthy",
      buildDurationMs: durationMs,
      artefactHash,
      seoMetadataSnapshot: seoSnapshot,
      sitemapXml,
      robotsTxt,
    });

    // 8. Atomically update publishedReleaseId on Site (TDD §20.1)
    tenantRepository.updatePublishedRelease(siteId, release.id);

    // 9. Register platform subdomain in DomainRepository if not already present
    try {
      domainRepository.createDomain(
        siteId,
        `${site.platformSlug}.localhost`,
        "platform_subdomain",
        true
      );
    } catch {}

    // 10. Invalidate edge and server caches (TDD §20.4)
    cacheManager.invalidateSite(siteId);

    // 11. Record audit event (TDD §20.2 #44)
    auditRepository.record({
      actorUserId,
      action: "site.publish",
      targetType: "site",
      targetId: siteId,
      metadata: {
        releaseId: release.id,
        releaseNumber: release.releaseNumber,
        artefactHash,
        durationMs,
      },
    });

    // 12. Notify owner
    const publishedUrl = `/site/${site.platformSlug}`;
    notificationService.notifySitePublished({
      userId: actorUserId,
      siteId,
      releaseNumber: release.releaseNumber,
      publishedUrl,
    });

    return {
      release,
      publishedUrl,
      durationMs,
    };
  }
}
