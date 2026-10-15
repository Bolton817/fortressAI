import * as fs from "node:fs";
import * as path from "node:path";

export interface NotificationRecord {
  id: string;
  userId: string;
  siteId?: string | null;
  idempotencyKey?: string | null;
  type: "BUILD_SUCCEEDED" | "BUILD_FAILED" | "SECURITY_ALERT" | "SYSTEM_UPDATE" | "GENERAL";
  title: string;
  body: string;
  targetRoute?: string | null;
  readAt?: Date | null;
  createdAt: Date;
}

function getNotificationDir(): string {
  const dir = path.join(process.cwd(), ".data", "notifications");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export class NotificationRepository {
  private notifications: Map<string, NotificationRecord> = new Map(); // id -> NotificationRecord
  private idempotencyIndex: Map<string, string> = new Map(); // idempotencyKey -> id

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      const nDir = getNotificationDir();
      const files = fs.readdirSync(nDir).filter((f) => f.endsWith(".json"));
      for (const file of files) {
        const raw = fs.readFileSync(path.join(nDir, file), "utf-8");
        const parsed = JSON.parse(raw);
        const record: NotificationRecord = {
          ...parsed,
          readAt: parsed.readAt ? new Date(parsed.readAt) : null,
          createdAt: new Date(parsed.createdAt),
        };
        this.notifications.set(record.id, record);
        if (record.idempotencyKey) {
          this.idempotencyIndex.set(record.idempotencyKey, record.id);
        }
      }
    } catch {}
  }

  private persistNotification(record: NotificationRecord): void {
    try {
      const nDir = getNotificationDir();
      fs.writeFileSync(path.join(nDir, `${record.id}.json`), JSON.stringify(record, null, 2));
    } catch (err) {
      console.error("Failed to persist notification to disk", err);
    }
  }

  public createNotification(data: {
    userId: string;
    siteId?: string | null;
    idempotencyKey?: string | null;
    type: "BUILD_SUCCEEDED" | "BUILD_FAILED" | "SECURITY_ALERT" | "SYSTEM_UPDATE" | "GENERAL";
    title: string;
    body: string;
    targetRoute?: string | null;
  }): NotificationRecord {
    this.loadFromDisk();
    if (data.idempotencyKey) {
      const existingId = this.idempotencyIndex.get(data.idempotencyKey);
      if (existingId) {
        return this.notifications.get(existingId)!;
      }
    }

    const id = crypto.randomUUID();
    const notification: NotificationRecord = {
      id,
      userId: data.userId,
      siteId: data.siteId || null,
      idempotencyKey: data.idempotencyKey || null,
      type: data.type,
      title: data.title.trim(),
      body: data.body.trim(),
      targetRoute: data.targetRoute || null,
      readAt: null,
      createdAt: new Date(),
    };

    this.notifications.set(id, notification);
    if (data.idempotencyKey) {
      this.idempotencyIndex.set(data.idempotencyKey, id);
    }
    this.persistNotification(notification);
    return notification;
  }

  public findForUser(userId: string, options?: { unreadOnly?: boolean; limit?: number }): NotificationRecord[] {
    this.loadFromDisk();
    const results: NotificationRecord[] = [];
    for (const notif of this.notifications.values()) {
      if (notif.userId === userId) {
        if (options?.unreadOnly && notif.readAt !== null) {
          continue;
        }
        results.push(notif);
      }
    }

    // Sort descending by creation date
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options?.limit) {
      return results.slice(0, options.limit);
    }
    return results;
  }

  public listForUser(userId: string, options?: { unreadOnly?: boolean; limit?: number }): NotificationRecord[] {
    return this.findForUser(userId, options);
  }

  public countUnreadForUser(userId: string): number {
    this.loadFromDisk();
    let count = 0;
    for (const notif of this.notifications.values()) {
      if (notif.userId === userId && notif.readAt === null) {
        count++;
      }
    }
    return count;
  }

  public markAsRead(id: string, userId: string): boolean {
    this.loadFromDisk();
    const notif = this.notifications.get(id);
    if (!notif) return false;
    // Strict tenant isolation: user can only mark their own notifications
    if (notif.userId !== userId) return false;

    if (!notif.readAt) {
      notif.readAt = new Date();
      this.notifications.set(id, notif);
      this.persistNotification(notif);
    }
    return true;
  }

  public markAllAsReadForUser(userId: string): number {
    this.loadFromDisk();
    let updated = 0;
    const now = new Date();
    for (const notif of this.notifications.values()) {
      if (notif.userId === userId && !notif.readAt) {
        notif.readAt = now;
        this.persistNotification(notif);
        updated++;
      }
    }
    return updated;
  }

  public clearAll(): void {
    this.notifications.clear();
    this.idempotencyIndex.clear();
    try {
      const nDir = getNotificationDir();
      for (const f of fs.readdirSync(nDir)) fs.unlinkSync(path.join(nDir, f));
    } catch {}
  }
}

export const notificationRepository = new NotificationRepository();
