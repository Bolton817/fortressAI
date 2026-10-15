import * as fs from "node:fs";
import * as path from "node:path";

export interface SessionRecord {
  id: string;
  sessionToken: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  createdAt: Date;
}

function getSessionDir(): string {
  const dir = path.join(process.cwd(), ".data", "sessions");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export class SessionRepository {
  private sessions: Map<string, SessionRecord> = new Map(); // id -> SessionRecord
  private tokenIndex: Map<string, string> = new Map(); // sessionToken -> id

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      const sDir = getSessionDir();
      const files = fs.readdirSync(sDir).filter((f) => f.endsWith(".json"));
      for (const file of files) {
        const raw = fs.readFileSync(path.join(sDir, file), "utf-8");
        const parsed = JSON.parse(raw);
        const record: SessionRecord = {
          ...parsed,
          expiresAt: new Date(parsed.expiresAt),
          revokedAt: parsed.revokedAt ? new Date(parsed.revokedAt) : null,
          createdAt: new Date(parsed.createdAt),
        };
        this.sessions.set(record.id, record);
        this.tokenIndex.set(record.sessionToken, record.id);
      }
    } catch {}
  }

  private persistSession(session: SessionRecord): void {
    try {
      const sDir = getSessionDir();
      fs.writeFileSync(path.join(sDir, `${session.id}.json`), JSON.stringify(session, null, 2));
    } catch (err) {
      console.error("Failed to persist session to disk", err);
    }
  }

  public createSession(data: {
    sessionToken: string;
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
  }): SessionRecord {
    this.loadFromDisk();
    const id = crypto.randomUUID();
    const session: SessionRecord = {
      id,
      sessionToken: data.sessionToken,
      userId: data.userId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      expiresAt: data.expiresAt,
      revokedAt: null,
      createdAt: new Date(),
    };

    this.sessions.set(id, session);
    this.tokenIndex.set(data.sessionToken, id);
    this.persistSession(session);
    return session;
  }

  public findValidSession(sessionToken: string): SessionRecord | null {
    this.loadFromDisk();
    const id = this.tokenIndex.get(sessionToken);
    if (!id) return null;
    const session = this.sessions.get(id);
    if (!session) return null;

    // Check revocation and expiration
    if (session.revokedAt) return null;
    if (session.expiresAt.getTime() < Date.now()) return null;

    return session;
  }

  public touchSession(sessionToken: string, newExpiresAt: Date): SessionRecord | null {
    this.loadFromDisk();
    const session = this.findValidSession(sessionToken);
    if (!session) return null;

    session.expiresAt = newExpiresAt;
    this.sessions.set(session.id, session);
    this.persistSession(session);
    return session;
  }

  public revokeSession(sessionToken: string): void {
    this.loadFromDisk();
    const id = this.tokenIndex.get(sessionToken);
    if (!id) return;
    const session = this.sessions.get(id);
    if (!session) return;

    session.revokedAt = new Date();
    this.sessions.set(session.id, session);
    this.persistSession(session);
  }

  public revokeAllUserSessions(userId: string): void {
    this.loadFromDisk();
    const now = new Date();
    for (const session of this.sessions.values()) {
      if (session.userId === userId && !session.revokedAt) {
        session.revokedAt = now;
        this.persistSession(session);
      }
    }
  }

  public listUserSessions(userId: string): SessionRecord[] {
    this.loadFromDisk();
    const results: SessionRecord[] = [];
    const now = Date.now();
    for (const session of this.sessions.values()) {
      if (session.userId === userId && !session.revokedAt && session.expiresAt.getTime() > now) {
        results.push(session);
      }
    }
    return results;
  }

  public clearAll(): void {
    this.sessions.clear();
    this.tokenIndex.clear();
    try {
      const sDir = getSessionDir();
      for (const f of fs.readdirSync(sDir)) fs.unlinkSync(path.join(sDir, f));
    } catch {}
  }
}

export const sessionRepository = new SessionRepository();
