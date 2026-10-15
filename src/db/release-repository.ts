import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { SiteConfiguration } from "@/core/schema/site-config";

/**
 * Fortress AI — Release Snapshot Repository (TDD §20.1, FR-033)
 * Invariant: Every published release is immutable; snapshots are permanent and can be safely restored.
 */

export interface SeoRouteMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  noindex?: boolean;
}

export interface StoredRelease {
  id: string;
  siteId: string;
  releaseNumber: number;
  config: SiteConfiguration;
  commitMessage?: string;
  publishedByUserId: string;
  healthStatus: "healthy" | "rolled_back" | "degraded";
  buildDurationMs?: number;
  artefactHash?: string;
  seoMetadataSnapshot?: Record<string, SeoRouteMetadata>;
  sitemapXml?: string;
  robotsTxt?: string;
  createdAt: string; // ISO timestamp
}

export class ReleaseRepository {
  private cache: Map<string, StoredRelease> = new Map(); // releaseId -> StoredRelease
  private siteIndex: Map<string, string[]> = new Map(); // siteId -> releaseId[]

  private getSiteReleaseDir(siteId: string): string {
    const dir = path.join(process.cwd(), ".data", "releases", siteId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  private loadSiteReleasesFromDisk(siteId: string): void {
    try {
      const dir = this.getSiteReleaseDir(siteId);
      if (!fs.existsSync(dir)) return;

      const files = fs.readdirSync(dir);
      const ids: string[] = [];
      for (const file of files) {
        if (file.endsWith(".json")) {
          const raw = fs.readFileSync(path.join(dir, file), "utf8");
          const release = JSON.parse(raw) as StoredRelease;
          if (release && release.id) {
            this.cache.set(release.id, release);
            ids.push(release.id);
          }
        }
      }
      this.siteIndex.set(siteId, ids);
    } catch {}
  }

  private persistReleaseToDisk(release: StoredRelease): void {
    try {
      const dir = this.getSiteReleaseDir(release.siteId);
      const filePath = path.join(dir, `${release.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(release, null, 2), "utf8");
    } catch {}
  }

  /**
   * Create an immutable release snapshot
   */
  public createRelease(
    siteId: string,
    params: {
      config: SiteConfiguration;
      publishedByUserId: string;
      commitMessage?: string;
      healthStatus?: "healthy" | "rolled_back" | "degraded";
      buildDurationMs?: number;
      artefactHash?: string;
      seoMetadataSnapshot?: Record<string, SeoRouteMetadata>;
      sitemapXml?: string;
      robotsTxt?: string;
    }
  ): StoredRelease {
    if (!this.siteIndex.has(siteId)) {
      this.loadSiteReleasesFromDisk(siteId);
    }

    const existingIds = this.siteIndex.get(siteId) || [];
    let maxNumber = 0;
    for (const id of existingIds) {
      const rel = this.cache.get(id);
      if (rel && rel.releaseNumber > maxNumber) {
        maxNumber = rel.releaseNumber;
      }
    }

    const releaseNumber = maxNumber + 1;
    const releaseId = randomUUID();

    const newRelease: StoredRelease = {
      id: releaseId,
      siteId,
      releaseNumber,
      config: JSON.parse(JSON.stringify(params.config)), // deep clone
      commitMessage: params.commitMessage || `Release #${releaseNumber}`,
      publishedByUserId: params.publishedByUserId,
      healthStatus: params.healthStatus || "healthy",
      buildDurationMs: params.buildDurationMs || 0,
      artefactHash: params.artefactHash,
      seoMetadataSnapshot: params.seoMetadataSnapshot,
      sitemapXml: params.sitemapXml,
      robotsTxt: params.robotsTxt,
      createdAt: new Date().toISOString(),
    };

    this.cache.set(releaseId, newRelease);
    existingIds.push(releaseId);
    this.siteIndex.set(siteId, existingIds);

    this.persistReleaseToDisk(newRelease);

    return { ...newRelease };
  }

  /**
   * Fetch single release by ID
   */
  public getRelease(releaseId: string): StoredRelease | null {
    if (this.cache.has(releaseId)) {
      return { ...this.cache.get(releaseId)! };
    }

    // Try scanning on disk
    try {
      const baseDir = path.join(process.cwd(), ".data", "releases");
      if (fs.existsSync(baseDir)) {
        const sites = fs.readdirSync(baseDir);
        for (const sId of sites) {
          const filePath = path.join(baseDir, sId, `${releaseId}.json`);
          if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, "utf8");
            const release = JSON.parse(raw) as StoredRelease;
            this.cache.set(release.id, release);
            return { ...release };
          }
        }
      }
    } catch {}

    return null;
  }

  /**
   * List all releases for a site ordered by releaseNumber descending
   */
  public listReleasesForSite(siteId: string): StoredRelease[] {
    if (!this.siteIndex.has(siteId)) {
      this.loadSiteReleasesFromDisk(siteId);
    }

    const ids = this.siteIndex.get(siteId) || [];
    const result: StoredRelease[] = [];
    for (const id of ids) {
      const rel = this.cache.get(id);
      if (rel) {
        result.push({ ...rel });
      }
    }

    return result.sort((a, b) => b.releaseNumber - a.releaseNumber);
  }

  /**
   * Get latest created release for a site
   */
  public getLatestRelease(siteId: string): StoredRelease | null {
    const list = this.listReleasesForSite(siteId);
    return list.length > 0 ? list[0] : null;
  }

  /**
   * Update health status (e.g. marked as rolled_back)
   */
  public updateHealthStatus(releaseId: string, status: "healthy" | "rolled_back" | "degraded"): void {
    const release = this.cache.get(releaseId);
    if (release) {
      release.healthStatus = status;
      this.persistReleaseToDisk(release);
    }
  }

  /**
   * Test reset
   */
  public clearAll(): void {
    this.cache.clear();
    this.siteIndex.clear();
    try {
      const dir = path.join(process.cwd(), ".data", "releases");
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch {}
  }

  /**
   * Test teardown for specific site
   */
  public deleteReleasesForSite(siteId: string): void {
    const ids = this.siteIndex.get(siteId) || [];
    for (const id of ids) {
      this.cache.delete(id);
    }
    this.siteIndex.delete(siteId);

    try {
      const dir = path.join(process.cwd(), ".data", "releases", siteId);
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch {}
  }
}

export const releaseRepository = new ReleaseRepository();
