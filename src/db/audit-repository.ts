import * as fs from "node:fs";
import * as path from "node:path";

export interface AuditEventRecord {
  id: string;
  actorUserId?: string | null;
  action: string;
  targetType: "user" | "site" | "session" | "notification" | "security";
  targetId: string;
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

  public record(data: {
    actorUserId?: string | null;
    action: string;
    targetType: "user" | "site" | "session" | "notification" | "security";
    targetId: string;
    metadataJson?: Record<string, any>;
    metadata?: Record<string, any>;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): AuditEventRecord {
    const id = crypto.randomUUID();
    const event: AuditEventRecord = {
      id,
      actorUserId: data.actorUserId || null,
      action: data.action,
      targetType: data.targetType,
      targetId: data.targetId,
      metadataJson: data.metadataJson || data.metadata,
      metadata: data.metadataJson || data.metadata,
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
  }): AuditEventRecord[] {
    return this.events.filter((e) => {
      if (filter?.targetType && e.targetType !== filter.targetType) return false;
      if (filter?.targetId && e.targetId !== filter.targetId) return false;
      if (filter?.actorUserId && e.actorUserId !== filter.actorUserId) return false;
      return true;
    });
  }

  public findByTarget(targetType: string, targetId: string): AuditEventRecord[] {
    return this.events.filter((e) => e.targetType === targetType && e.targetId === targetId);
  }

  public findByActor(actorUserId: string): AuditEventRecord[] {
    return this.events.filter((e) => e.actorUserId === actorUserId);
  }

  public clearAll(): void {
    this.events = [];
    try {
      const aDir = getAuditDir();
      for (const f of fs.readdirSync(aDir)) fs.unlinkSync(path.join(aDir, f));
    } catch {}
  }
}

export const auditRepository = new AuditRepository();
