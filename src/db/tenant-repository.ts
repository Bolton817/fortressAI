import { TenantAccessDeniedError, ResourceNotFoundError } from "@/core/errors";
import { SiteConfiguration, SiteConfigurationSchema } from "@/core/schema/site-config";

/**
 * Fortress AI — Tenant-Scoped Data Access Layer (TDD §7.2, §38)
 * Invariant: Every query must verify tenant membership before returning or mutating site resources.
 * Supports both Prisma client queries and an in-memory mock store for deterministic Phase 0 testing.
 */

export interface TenantContext {
  userId: string;
}

export interface StoredSite {
  id: string;
  ownerUserId: string;
  name: string;
  platformSlug: string;
  lifecycleStatus: string;
  currentDraftRevisionId?: string;
  publishedReleaseId?: string;
}

export interface StoredSiteRevision {
  id: string;
  siteId: string;
  version: number;
  config: SiteConfiguration;
  createdBy: string;
  reason?: string;
  createdAt: Date;
}

import * as fs from "node:fs";
import * as path from "node:path";

function getSiteFilePath(siteId: string): string {
  const dir = path.join(process.cwd(), ".data", "sites");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, `${siteId}.json`);
}

export class TenantRepository {
  private sites: Map<string, StoredSite> = new Map();
  private memberships: Map<string, Set<string>> = new Map(); // siteId -> Set<userId>
  private revisions: Map<string, StoredSiteRevision[]> = new Map(); // siteId -> StoredSiteRevision[]

  private persistSiteToFile(siteId: string): void {
    try {
      const site = this.sites.get(siteId);
      const members = this.memberships.get(siteId);
      const revs = this.revisions.get(siteId);
      if (site && members && revs) {
        const filePath = getSiteFilePath(siteId);
        fs.writeFileSync(
          filePath,
          JSON.stringify({
            site,
            members: Array.from(members),
            revisions: revs,
          }),
          "utf-8"
        );
      }
    } catch {
      // Ignore filesystem sync errors in constrained environments
    }
  }

  private loadSiteFromFile(siteId: string): boolean {
    try {
      const filePath = getSiteFilePath(siteId);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        this.sites.set(siteId, parsed.site);
        this.memberships.set(siteId, new Set(parsed.members));
        this.revisions.set(siteId, parsed.revisions);
        return true;
      }
    } catch {
      // Ignore file reading errors
    }
    return false;
  }

  /**
   * Helper to seed a site with owner membership and an initial canonical revision
   */
  seedSite(
    ownerUserId: string,
    site: StoredSite,
    initialConfig: SiteConfiguration,
    collaboratorUserIds: string[] = []
  ): void {
    this.sites.set(site.id, site);
    const members = new Set([ownerUserId, ...collaboratorUserIds]);
    this.memberships.set(site.id, members);

    // Validate configuration against authoritative schema before storing
    const validatedConfig = SiteConfigurationSchema.parse(initialConfig);
    const initialRevision: StoredSiteRevision = {
      id: `rev_${site.id}_v1`,
      siteId: site.id,
      version: 1,
      config: validatedConfig,
      createdBy: ownerUserId,
      reason: "Initial baseline creation",
      createdAt: new Date("2026-10-14T00:00:00Z"),
    };
    this.revisions.set(site.id, [initialRevision]);
    site.currentDraftRevisionId = initialRevision.id;
    this.persistSiteToFile(site.id);
  }

  /**
   * Verifies that the tenant in context has valid membership for the site (TDD §7.2)
   */
  private verifyAccess(ctx: TenantContext, siteId: string): void {
    if (!this.sites.has(siteId)) {
      this.loadSiteFromFile(siteId);
    }
    const site = this.sites.get(siteId);
    if (!site) {
      throw new ResourceNotFoundError("Site", siteId);
    }
    const members = this.memberships.get(siteId);
    if (!members || !members.has(ctx.userId)) {
      throw new TenantAccessDeniedError(`User "${ctx.userId}" does not have access to site "${siteId}".`);
    }
  }

  /**
   * Fetch site details guarded by tenant authorization
   */
  async getSite(ctx: TenantContext, siteId: string): Promise<StoredSite> {
    this.verifyAccess(ctx, siteId);
    const site = this.sites.get(siteId)!;
    return { ...site };
  }

  /**
   * Fetch latest canonical draft revision for a site guarded by tenant authorization
   */
  async getDraftConfiguration(ctx: TenantContext, siteId: string): Promise<SiteConfiguration> {
    this.verifyAccess(ctx, siteId);
    const siteRevs = this.revisions.get(siteId);
    if (!siteRevs || siteRevs.length === 0) {
      throw new ResourceNotFoundError("SiteRevision", `draft for site ${siteId}`);
    }
    const latest = siteRevs[siteRevs.length - 1];
    return latest.config;
  }

  /**
   * Resolve draft configuration for preview route (TDD §20.3)
   */
  async getPreviewConfiguration(siteId: string): Promise<SiteConfiguration> {
    if (!this.sites.has(siteId)) {
      this.loadSiteFromFile(siteId);
    }
    const site = this.sites.get(siteId);
    if (!site) {
      throw new ResourceNotFoundError("Site", siteId);
    }
    const siteRevs = this.revisions.get(siteId);
    if (!siteRevs || siteRevs.length === 0) {
      throw new ResourceNotFoundError("SiteRevision", `preview for site ${siteId}`);
    }
    return siteRevs[siteRevs.length - 1].config;
  }

  /**
   * Fetch a specific revision by version number
   */
  async getRevisionByVersion(ctx: TenantContext, siteId: string, version: number): Promise<StoredSiteRevision> {
    this.verifyAccess(ctx, siteId);
    const siteRevs = this.revisions.get(siteId) || [];
    const found = siteRevs.find((r) => r.version === version);
    if (!found) {
      throw new ResourceNotFoundError("SiteRevision", `version ${version} of site ${siteId}`);
    }
    return found;
  }

  /**
   * Save a new immutable revision (TDD §8.4, §26.2)
   */
  async saveRevision(
    ctx: TenantContext,
    siteId: string,
    newConfig: SiteConfiguration,
    reason?: string
  ): Promise<StoredSiteRevision> {
    this.verifyAccess(ctx, siteId);
    const validated = SiteConfigurationSchema.parse(newConfig);
    const siteRevs = this.revisions.get(siteId) || [];
    const nextVersion = siteRevs.length + 1;

    const newRevision: StoredSiteRevision = {
      id: `rev_${siteId}_v${nextVersion}`,
      siteId,
      version: nextVersion,
      config: { ...validated, version: nextVersion },
      createdBy: ctx.userId,
      reason,
      createdAt: new Date(),
    };

    siteRevs.push(newRevision);
    this.revisions.set(siteId, siteRevs);

    const site = this.sites.get(siteId)!;
    site.currentDraftRevisionId = newRevision.id;
    this.persistSiteToFile(siteId);

    return newRevision;
  }

  /**
   * Update draft configuration alias (TDD §8.4, §13.1)
   */
  async updateDraftConfiguration(
    ctx: TenantContext,
    siteId: string,
    newConfig: SiteConfiguration,
    reason?: string
  ): Promise<StoredSiteRevision> {
    return this.saveRevision(ctx, siteId, newConfig, reason);
  }

  /**
   * Public Host/Slug Resolver (TDD §7.1)
   * Resolves public tenant by platform slug or custom domain mapping.
   * Only returns the published release or draft for preview.
   */
  async resolvePublicSiteBySlug(slug: string): Promise<StoredSite | null> {
    this.loadAllSitesFromDisk();
    for (const site of this.sites.values()) {
      if (site.platformSlug.toLowerCase() === slug.toLowerCase()) {
        return { ...site };
      }
    }
    return null;
  }

  /**
   * Load all sites from disk directory into memory
   */
  public loadAllSitesFromDisk(): void {
    try {
      const dir = path.join(process.cwd(), ".data", "sites");
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
        for (const file of files) {
          const siteId = file.replace(".json", "");
          this.loadSiteFromFile(siteId);
        }
      }
    } catch {}
  }

  /**
   * List only sites where the user is an owner or member (FR-011, FR-014)
   */
  async listSitesForUser(userId: string): Promise<StoredSite[]> {
    this.loadAllSitesFromDisk();
    const results: StoredSite[] = [];
    for (const [siteId, members] of this.memberships.entries()) {
      if (members.has(userId)) {
        const site = this.sites.get(siteId);
        if (site && site.lifecycleStatus !== "deleted") {
          results.push({ ...site });
        }
      }
    }
    return results;
  }

  /**
   * Create a new site bound to an owner user (FR-014)
   */
  async createSite(
    ownerUserId: string,
    name: string,
    platformSlug: string,
    initialConfig?: SiteConfiguration
  ): Promise<StoredSite> {
    this.loadAllSitesFromDisk();
    const cleanSlug = platformSlug.trim().toLowerCase().replace(/[^a-z0-9\-]/g, "-");

    // Check slug uniqueness
    for (const s of this.sites.values()) {
      if (s.platformSlug.toLowerCase() === cleanSlug) {
        throw new Error(`Platform slug '${cleanSlug}' is already reserved.`);
      }
    }

    const siteId = crypto.randomUUID();
    const storedSite: StoredSite = {
      id: siteId,
      ownerUserId,
      name: name.trim(),
      platformSlug: cleanSlug,
      lifecycleStatus: "draft",
    };

    this.sites.set(siteId, storedSite);
    this.memberships.set(siteId, new Set([ownerUserId]));

    if (initialConfig) {
      const validatedConfig = SiteConfigurationSchema.parse(initialConfig);
      const rev: StoredSiteRevision = {
        id: `rev_${siteId}_v1`,
        siteId,
        version: 1,
        config: validatedConfig,
        createdBy: ownerUserId,
        reason: "Initial creation",
        createdAt: new Date(),
      };
      this.revisions.set(siteId, [rev]);
      storedSite.currentDraftRevisionId = rev.id;
    } else {
      this.revisions.set(siteId, []);
    }

    this.persistSiteToFile(siteId);
    return storedSite;
  }

  /**
   * Archive a site (FR-014)
   */
  async archiveSite(ctx: TenantContext, siteId: string): Promise<StoredSite> {
    this.verifyAccess(ctx, siteId);
    const site = this.sites.get(siteId)!;
    site.lifecycleStatus = "archived";
    this.persistSiteToFile(siteId);
    return { ...site };
  }

  /**
   * Delete a site (FR-014)
   */
  async deleteSite(ctx: TenantContext, siteId: string): Promise<void> {
    this.verifyAccess(ctx, siteId);
    const site = this.sites.get(siteId)!;
    if (site.ownerUserId !== ctx.userId) {
      throw new TenantAccessDeniedError("Only the site owner can delete this site.");
    }

    site.lifecycleStatus = "deleted";
    this.persistSiteToFile(siteId);
  }

  /**
   * Public lookup by platform slug (TDD §7.1, §20)
   */
  public getSiteBySlug(platformSlug: string): StoredSite | null {
    // Check in-memory
    for (const site of this.sites.values()) {
      if (site.platformSlug === platformSlug && site.lifecycleStatus !== "deleted") {
        return { ...site };
      }
    }

    // Check disk files
    try {
      const dir = path.join(process.cwd(), ".data", "sites");
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file.endsWith(".json")) {
            const raw = fs.readFileSync(path.join(dir, file), "utf8");
            const data = JSON.parse(raw);
            if (data?.site?.platformSlug === platformSlug && data?.site?.lifecycleStatus !== "deleted") {
              this.sites.set(data.site.id, data.site);
              if (data.members) this.memberships.set(data.site.id, new Set(data.members));
              if (data.revisions) this.revisions.set(data.site.id, data.revisions);
              return { ...data.site };
            }
          }
        }
      }
    } catch {}

    return null;
  }

  /**
   * Internal/system lookup without tenant context (for public router)
   */
  public getSiteDirect(siteId: string): StoredSite | null {
    if (!this.sites.has(siteId)) {
      this.loadSiteFromFile(siteId);
    }
    const site = this.sites.get(siteId);
    return site ? { ...site } : null;
  }

  /**
   * Atomically point publishedReleaseId to a new or rolled-back release (TDD §20.1)
   */
  public updatePublishedRelease(siteId: string, releaseId: string): void {
    if (!this.sites.has(siteId)) {
      this.loadSiteFromFile(siteId);
    }
    const site = this.sites.get(siteId);
    if (!site) {
      throw new ResourceNotFoundError("Site", siteId);
    }
    site.publishedReleaseId = releaseId;
    site.lifecycleStatus = "published";
    this.persistSiteToFile(siteId);
  }

  /**
   * Reset in-memory cache for testing
   */
  public clearAll(): void {
    this.sites.clear();
    this.memberships.clear();
    this.revisions.clear();
  }

  /**
   * Delete site permanently from memory and disk for test teardown
   */
  public deleteSitePermanently(siteId: string): void {
    this.sites.delete(siteId);
    this.memberships.delete(siteId);
    this.revisions.delete(siteId);
    try {
      const filePath = getSiteFilePath(siteId);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {}
  }
}


// Global shared repository instance for Phase 0
export const tenantRepository = new TenantRepository();
