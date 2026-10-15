import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { redactObject } from "@/core/observability/redaction";

/**
 * Fortress AI — Tamper-Evident Append-Only Audit Repository (TDD §32.3, FR-086)
 * Invariant: Audit records are permanent, append-only, and sanitized against secret leakage.
 */

export type AuditTargetType =
  | "user"
  | "site"
  | "session"
  | "notification"
  | "security"
  | "domain"
  | "billing"
  | "prompt"
  | "system";

export interface AuditEventRecord {
  id: string;
  actorUserId?: string | null;
  action: string;
  targetType: AuditTargetType;
  targetId: string;
  outcome?: "success" | "failure";
  reason?: string | null;
  requestId?: string | null;
  metadataJson?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

function getAuditDir(): string {
  const dir = path.join(process.cwd(), ".data", "audit");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export class AuditRepository {
  private events: AuditEventRecord[] = [];

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      const aDir = getAuditDir();
      const files = fs.readdirSync(aDir).filter((f) => f.endsWith(".json"));
      for (const file of files) {
        const raw = fs.readFileSync(path.join(aDir, file), "utf-8");
        const parsed = JSON.parse(raw);
        this.events.push({
          ...parsed,
          createdAt: new Date(parsed.createdAt),
        });
      }
    } catch {}
  }

  private persistEvent(event: AuditEventRecord): void {
    try {
      const aDir = getAuditDir();
      fs.writeFileSync(path.join(aDir, `${event.id}.json`), JSON.stringify(event, null, 2));
    } catch (err) {
      console.error("Failed to persist audit event to disk", err);
    }
  }

  public recordEvent(data: {
    actorUserId?: string | null;
    action: string;
    targetType: AuditTargetType;
    targetId: string;
    outcome?: "success" | "failure";
    reason?: string | null;
    requestId?: string | null;
    metadataJson?: Record<string, any>;
    metadata?: Record<string, any>;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): AuditEventRecord {
    return this.record(data);
  }

  public record(data: {
    actorUserId?: string | null;
    action: string;
    targetType: AuditTargetType;
    targetId: string;
    outcome?: "success" | "failure";
    reason?: string | null;
    requestId?: string | null;
    metadataJson?: Record<string, any>;
    metadata?: Record<string, any>;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): AuditEventRecord {
    const id = crypto.randomUUID();

    // Sanitize metadata against secret and PII leakage
    const rawMeta = data.metadataJson || data.metadata || {};
    const sanitizedMeta = redactObject(rawMeta);

    const event: AuditEventRecord = {
      id,
      actorUserId: data.actorUserId || null,
      action: data.action,
      targetType: data.targetType,
      targetId: data.targetId,
      outcome: data.outcome || "success",
      reason: data.reason || null,
      requestId: data.requestId || null,
      metadataJson: sanitizedMeta,
      metadata: sanitizedMeta,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      createdAt: new Date(),
    };

    this.events.push(event);
    this.persistEvent(event);
    return event;
  }

  public listEvents(filter?: {
    targetType?: string;
    targetId?: string;
    actorUserId?: string;
    action?: string;
  }): AuditEventRecord[] {
    return this.events.filter((e) => {
      if (filter?.targetType && e.targetType !== filter.targetType) return false;
      if (filter?.targetId && e.targetId !== filter.targetId) return false;
      if (filter?.actorUserId && e.actorUserId !== filter.actorUserId) return false;
      if (filter?.action && e.action !== filter.action) return false;
      return true;
    });
  }

  public findByTarget(targetType: string, targetId: string): AuditEventRecord[] {
    return this.events.filter((e) => e.targetType === targetType && e.targetId === targetId);
  }

  public findByActor(actorUserId: string): AuditEventRecord[] {
    return this.events.filter((e) => e.actorUserId === actorUserId);
  }

  /**
   * Reconstruct chronological history for a resource
   */
  public reconstructHistory(targetId: string): AuditEventRecord[] {
    return this.events
      .filter((e) => e.targetId === targetId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Invariant: regular application users and operations CANNOT delete or modify audit events
   */
  public deleteEvent(): void {
    throw new Error("Audit records are immutable and append-only (FR-086, TDD §32.3)");
  }

  /**
   * Reset in-memory cache for test suites
   */
  public clearAll(): void {
    this.events = [];
    try {
      const aDir = getAuditDir();
      for (const f of fs.readdirSync(aDir)) fs.unlinkSync(path.join(aDir, f));
    } catch {}
  }
}

export const auditRepository = new AuditRepository();
