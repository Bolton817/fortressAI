import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID, randomBytes } from "node:crypto";
import { tenantRepository } from "./tenant-repository";

/**
 * Fortress AI — Domain & Subdomain Mapping Repository (TDD §7.1, §20, FR-060, FR-061)
 */

export interface StoredDomainMapping {
  id: string;
  siteId: string;
  hostname: string;
  domainType: "platform_subdomain" | "custom_apex" | "custom_subdomain";
  verificationToken: string;
  verificationStatus: "pending" | "verified" | "failed";
  sslStatus: "pending" | "active" | "error";
  isPrimary: boolean;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export class DomainRepository {
  private domains: Map<string, StoredDomainMapping> = new Map(); // hostname -> StoredDomainMapping
  private siteDomains: Map<string, Set<string>> = new Map(); // siteId -> Set<hostname>

  private getDomainsDir(): string {
    const dir = path.join(process.cwd(), ".data", "domains");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  private loadAllFromDisk(): void {
    try {
      const dir = this.getDomainsDir();
      if (!fs.existsSync(dir)) return;

      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.endsWith(".json")) {
          const raw = fs.readFileSync(path.join(dir, file), "utf8");
          const mapping = JSON.parse(raw) as StoredDomainMapping;
          if (mapping && mapping.hostname) {
            this.domains.set(mapping.hostname, mapping);
            if (!this.siteDomains.has(mapping.siteId)) {
              this.siteDomains.set(mapping.siteId, new Set());
            }
            this.siteDomains.get(mapping.siteId)!.add(mapping.hostname);
          }
        }
      }
    } catch {}
  }

  private persistMappingToDisk(mapping: StoredDomainMapping): void {
    try {
      const dir = this.getDomainsDir();
      const safeFilename = `${mapping.hostname.replace(/[^a-zA-Z0-9.-]/g, "_")}.json`;
      fs.writeFileSync(path.join(dir, safeFilename), JSON.stringify(mapping, null, 2), "utf8");
    } catch {}
  }

  constructor() {
    this.loadAllFromDisk();
  }

  /**
   * Normalise hostname (lowercase, trim port/protocol/slashes)
   */
  public normaliseHostname(raw: string): string {
    return raw
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .split(":")[0];
  }

  /**
   * Create a domain mapping for a site
   */
  public createDomain(
    siteId: string,
    rawHostname: string,
    domainType: "platform_subdomain" | "custom_apex" | "custom_subdomain" = "platform_subdomain",
    isPrimary: boolean = false
  ): StoredDomainMapping {
    const hostname = this.normaliseHostname(rawHostname);

    const existing = this.domains.get(hostname);
    if (existing) {
      if (existing.siteId !== siteId) {
        throw new Error(`Hostname "${hostname}" is already assigned to another site.`);
      }
      return { ...existing };
    }

    const verificationToken = randomBytes(16).toString("hex");
    const isAutoVerified = domainType === "platform_subdomain";

    const mapping: StoredDomainMapping = {
      id: randomUUID(),
      siteId,
      hostname,
      domainType,
      verificationToken,
      verificationStatus: isAutoVerified ? "verified" : "pending",
      sslStatus: isAutoVerified ? "active" : "pending",
      isPrimary,
      verifiedAt: isAutoVerified ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.domains.set(hostname, mapping);
    if (!this.siteDomains.has(siteId)) {
      this.siteDomains.set(siteId, new Set());
    }
    this.siteDomains.get(siteId)!.add(hostname);

    this.persistMappingToDisk(mapping);
    return { ...mapping };
  }

  /**
   * Get domain mapping by hostname
   */
  public getDomain(rawHostname: string): StoredDomainMapping | null {
    const hostname = this.normaliseHostname(rawHostname);
    const found = this.domains.get(hostname);
    return found ? { ...found } : null;
  }

  /**
   * List all domains registered for a site
   */
  public listDomainsForSite(siteId: string): StoredDomainMapping[] {
    const hostnames = this.siteDomains.get(siteId);
    if (!hostnames) return [];

    const list: StoredDomainMapping[] = [];
    for (const h of hostnames) {
      const mapping = this.domains.get(h);
      if (mapping) list.push({ ...mapping });
    }
    return list;
  }

  /**
   * Mark domain as verified (DNS check succeeded)
   */
  public verifyDomain(rawHostname: string): StoredDomainMapping {
    const hostname = this.normaliseHostname(rawHostname);
    const mapping = this.domains.get(hostname);
    if (!mapping) {
      throw new Error(`Domain "${hostname}" not found.`);
    }

    mapping.verificationStatus = "verified";
    mapping.sslStatus = "active";
    mapping.verifiedAt = new Date().toISOString();
    mapping.updatedAt = new Date().toISOString();

    this.persistMappingToDisk(mapping);
    return { ...mapping };
  }

  /**
   * Fast resolution from incoming HTTP Host header to siteId (TDD §7.1)
   */
  public resolveSiteIdFromHostname(rawHostname: string): { siteId: string; slug: string } | null {
    const hostname = this.normaliseHostname(rawHostname);

    // 1. Check direct domain mapping
    const mapping = this.domains.get(hostname);
    if (mapping && mapping.verificationStatus === "verified") {
      const site = tenantRepository.getSiteDirect(mapping.siteId);
      if (site && site.lifecycleStatus !== "deleted") {
        return { siteId: site.id, slug: site.platformSlug };
      }
    }

    // 2. Check if hostname is a platform subdomain: e.g. "mara-safaris.localhost" or "mara-safaris.fortressai.app"
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      const candidateSlug = parts[0];
      // Exclude generic prefixes like 'www', 'app', 'api'
      if (!["www", "app", "api", "admin", "preview"].includes(candidateSlug)) {
        const site = tenantRepository.getSiteBySlug(candidateSlug);
        if (site) {
          return { siteId: site.id, slug: site.platformSlug };
        }
      }
    }

    return null;
  }

  /**
   * Delete domain mapping
   */
  public deleteDomain(rawHostname: string): void {
    const hostname = this.normaliseHostname(rawHostname);
    const mapping = this.domains.get(hostname);
    if (mapping) {
      this.domains.delete(hostname);
      this.siteDomains.get(mapping.siteId)?.delete(hostname);

      try {
        const safeFilename = `${hostname.replace(/[^a-zA-Z0-9.-]/g, "_")}.json`;
        const filePath = path.join(this.getDomainsDir(), safeFilename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {}
    }
  }

  /**
   * Reset for testing
   */
  public clearAll(): void {
    this.domains.clear();
    this.siteDomains.clear();
  }
}

export const domainRepository = new DomainRepository();
