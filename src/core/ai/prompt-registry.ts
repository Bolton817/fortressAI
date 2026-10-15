import { auditRepository } from "@/db/audit-repository";

/**
 * Fortress AI — Prompt & Model Registry (TDD §10, §15, §34.2, FR-088)
 * Manages immutable prompt contracts, canary rollouts, and version pinning for reproducible AI builds.
 */

export interface PromptVersionRecord {
  version: string; // Semantic version e.g. "1.0.0"
  status: "approved" | "canary" | "deprecated" | "rolled_back";
  model: string; // e.g. "gemini-2.5-flash"
  temperature: number;
  systemInstruction: string;
  sitePlanPromptContract: string;
  pageCopyPromptContract: string;
  maxOutputTokens: number;
  publishedAt: string;
  evaluatedArchetypes: string[];
}

export class PromptRegistry {
  private versions: Map<string, PromptVersionRecord> = new Map();
  private activeVersionId: string = "1.0.0";
  private jobPinnedVersions: Map<string, string> = new Map(); // jobId -> version

  constructor() {
    this.seedDefaultVersion();
  }

  private seedDefaultVersion(): void {
    const v1: PromptVersionRecord = {
      version: "1.0.0",
      status: "approved",
      model: "gemini-2.5-flash",
      temperature: 0.2,
      systemInstruction:
        "You are Fortress AI's structured website composition architect. Never fabricate customer testimonials, fake pricing, or false awards. Enforce strict schema constraints and localized business relevance.",
      sitePlanPromptContract:
        "Generate a structured SitePlan conforming to SitePlanSchema based on the business brief.",
      pageCopyPromptContract:
        "Generate section copy conforming to PageCopySchema adhering to tone, language, and provided factual evidence.",
      maxOutputTokens: 4096,
      publishedAt: new Date("2026-10-14T00:00:00Z").toISOString(),
      evaluatedArchetypes: [
        "tourism_safari",
        "law_firm",
        "cafe_bakery",
        "electrical_trades",
        "boutique_retail",
        "healthcare_dental",
      ],
    };
    this.versions.set(v1.version, v1);
  }

  /**
   * Get the currently active production prompt version
   */
  public getActivePromptVersion(): PromptVersionRecord {
    return { ...this.versions.get(this.activeVersionId)! };
  }

  /**
   * Fetch specific prompt version
   */
  public getPromptVersion(version: string): PromptVersionRecord | null {
    const found = this.versions.get(version);
    return found ? { ...found } : null;
  }

  /**
   * Register a new prompt version (starts as canary or approved)
   */
  public registerPromptVersion(record: PromptVersionRecord): void {
    this.versions.set(record.version, { ...record });
  }

  /**
   * Promote a canary version to active production
   */
  public promoteCanary(version: string, actorUserId: string = "system"): void {
    const target = this.versions.get(version);
    if (!target) {
      throw new Error(`Prompt version "${version}" not found.`);
    }
    target.status = "approved";
    this.activeVersionId = version;

    auditRepository.record({
      actorUserId,
      action: "prompt.rollout_promoted",
      targetType: "prompt",
      targetId: version,
      reason: `Promoted prompt version ${version} to active production.`,
    });
  }

  /**
   * Emergency rollback to a previous prompt version
   */
  public rollbackToVersion(version: string, reason: string, actorUserId: string = "system"): void {
    const target = this.versions.get(version);
    if (!target) {
      throw new Error(`Target prompt version "${version}" not found for rollback.`);
    }
    const previous = this.activeVersionId;
    if (this.versions.has(previous)) {
      this.versions.get(previous)!.status = "rolled_back";
    }
    target.status = "approved";
    this.activeVersionId = version;

    auditRepository.record({
      actorUserId,
      action: "prompt.rollback",
      targetType: "prompt",
      targetId: version,
      reason,
      metadata: { fromVersion: previous, toVersion: version },
    });
  }

  /**
   * Pin a specific generation job to an immutable prompt version
   */
  public pinJobPrompt(jobId: string, requestedVersion?: string): PromptVersionRecord {
    const versionToUse = requestedVersion || this.activeVersionId;
    const record = this.versions.get(versionToUse) || this.getActivePromptVersion();
    this.jobPinnedVersions.set(jobId, record.version);
    return { ...record };
  }

  /**
   * Retrieve the pinned prompt version for an in-flight or completed job
   */
  public getJobPinnedVersion(jobId: string): PromptVersionRecord {
    const version = this.jobPinnedVersions.get(jobId) || this.activeVersionId;
    return this.getPromptVersion(version) || this.getActivePromptVersion();
  }

  /**
   * Reset registry for unit tests
   */
  public clearAll(): void {
    this.versions.clear();
    this.jobPinnedVersions.clear();
    this.seedDefaultVersion();
    this.activeVersionId = "1.0.0";
  }
}

export const promptRegistry = new PromptRegistry();
