import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

/**
 * Fortress AI — Versioned Legal Policy Repository (TDD §28.1, §36.1, FR-090)
 * Stores immutable policy versions and customer acceptance records.
 */

export type PolicyIdentifier = "tos" | "privacy" | "domain" | "aup";

export interface StoredPolicyDocument {
  id: PolicyIdentifier;
  title: string;
  version: string; // e.g. "1.0.0"
  effectiveDate: string;
  summary: string;
  fullText: string;
}

export interface StoredPolicyAcceptance {
  id: string;
  userId: string;
  policyId: PolicyIdentifier;
  version: string;
  acceptedAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function getPolicyDir(): string {
  const dir = path.join(process.cwd(), ".data", "legal-policies");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export class LegalPolicyRepository {
  private policies: Map<PolicyIdentifier, StoredPolicyDocument> = new Map();
  private acceptances: Map<string, StoredPolicyAcceptance> = new Map(); // id -> StoredPolicyAcceptance
  private userAcceptanceIndex: Map<string, StoredPolicyAcceptance[]> = new Map(); // `${userId}:${policyId}` -> acceptances

  constructor() {
    this.seedDefaultPolicies();
    this.loadFromDisk();
  }

  private seedDefaultPolicies(): void {
    const tos: StoredPolicyDocument = {
      id: "tos",
      title: "Fortress AI Terms of Service",
      version: "1.0.0",
      effectiveDate: "2026-10-14",
      summary: "Customer owns generated content and custom domains; platform provides hosted builder and export tools.",
      fullText:
        "Fortress AI Terms of Service v1.0.0. Customers retain 100% ownership of their generated business copy, layout structure, and attached domain registrations. Subscriptions renew automatically unless cancelled before the renewal date. Customers may export their static package at any time under paid entitlements.",
    };

    const privacy: StoredPolicyDocument = {
      id: "privacy",
      title: "Fortress AI Privacy Notice",
      version: "1.0.0",
      effectiveDate: "2026-10-14",
      summary: "Data protection compliant with Kenya DPA 2019 and GDPR. No selling of customer data.",
      fullText:
        "Fortress AI Privacy Notice v1.0.0. We process personal and business data strictly to deliver website generation, hosting, domain registration, and invoicing. Marketing newsletter consent is voluntary, unbundled, and may be revoked with a single click without affecting active hosting services.",
    };

    const domain: StoredPolicyDocument = {
      id: "domain",
      title: "Domain Ownership, Renewal & Transfer Policy",
      version: "1.0.0",
      effectiveDate: "2026-10-14",
      summary: "Zero dark patterns; customer is legal registrant; immediate EPP transfer auth code on request.",
      fullText:
        "Domain Policy v1.0.0. Customers are designated as the authoritative legal registrant for all registered domains. Transfer auth codes (EPP codes) are accessible on-demand with zero retention delays or lock-in penalties. Renewal notices are dispatched at 30, 14, 7, and 1 days before expiration.",
    };

    const aup: StoredPolicyDocument = {
      id: "aup",
      title: "Acceptable Use Policy",
      version: "1.0.0",
      effectiveDate: "2026-10-14",
      summary: "Prohibits fraudulent websites, phishing, malware, and unlicensed media.",
      fullText:
        "Acceptable Use Policy v1.0.0. Sites hosted or generated through Fortress AI must not engage in phishing, fraudulent investment schemes, malware distribution, hate speech, or unlicensed intellectual property infringement.",
    };

    this.policies.set("tos", tos);
    this.policies.set("privacy", privacy);
    this.policies.set("domain", domain);
    this.policies.set("aup", aup);
  }

  private loadFromDisk(): void {
    try {
      const pDir = getPolicyDir();
      const files = fs.readdirSync(pDir).filter((f) => f.endsWith(".json"));
      for (const file of files) {
        const raw = fs.readFileSync(path.join(pDir, file), "utf-8");
        const acceptance = JSON.parse(raw) as StoredPolicyAcceptance;
        this.indexAcceptance(acceptance);
      }
    } catch {}
  }

  private indexAcceptance(acc: StoredPolicyAcceptance): void {
    this.acceptances.set(acc.id, acc);
    const key = `${acc.userId}:${acc.policyId}`;
    const list = this.userAcceptanceIndex.get(key) || [];
    list.push(acc);
    this.userAcceptanceIndex.set(key, list);
  }

  private persistAcceptance(acc: StoredPolicyAcceptance): void {
    try {
      const pDir = getPolicyDir();
      fs.writeFileSync(path.join(pDir, `${acc.id}.json`), JSON.stringify(acc, null, 2), "utf-8");
    } catch {}
  }

  public getPolicy(policyId: PolicyIdentifier): StoredPolicyDocument | null {
    return this.policies.get(policyId) || null;
  }

  public recordAcceptance(data: {
    userId: string;
    policyId: PolicyIdentifier;
    version: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): StoredPolicyAcceptance {
    const policy = this.getPolicy(data.policyId);
    if (!policy) {
      throw new Error(`Policy "${data.policyId}" does not exist.`);
    }

    const id = `acc_${crypto.randomUUID()}`;
    const acceptance: StoredPolicyAcceptance = {
      id,
      userId: data.userId,
      policyId: data.policyId,
      version: data.version,
      acceptedAt: new Date().toISOString(),
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
    };

    this.indexAcceptance(acceptance);
    this.persistAcceptance(acceptance);
    return acceptance;
  }

  public getLatestAcceptance(
    userId: string,
    policyId: PolicyIdentifier
  ): StoredPolicyAcceptance | null {
    const key = `${userId}:${policyId}`;
    const list = this.userAcceptanceIndex.get(key) || [];
    if (list.length === 0) return null;
    return list[list.length - 1];
  }

  public hasAcceptedCurrentVersion(userId: string, policyId: PolicyIdentifier): boolean {
    const policy = this.getPolicy(policyId);
    if (!policy) return false;
    const latest = this.getLatestAcceptance(userId, policyId);
    if (!latest) return false;
    return latest.version === policy.version;
  }

  public clearAll(): void {
    this.acceptances.clear();
    this.userAcceptanceIndex.clear();
    try {
      const pDir = getPolicyDir();
      for (const f of fs.readdirSync(pDir)) fs.unlinkSync(path.join(pDir, f));
    } catch {}
  }
}

export const legalPolicyRepository = new LegalPolicyRepository();
