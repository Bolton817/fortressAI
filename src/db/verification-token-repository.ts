import * as fs from "node:fs";
import * as path from "node:path";

export interface VerificationTokenRecord {
  id: string;
  tokenHash: string;
  identifier: string; // e.g. user email or user ID
  tokenType: "email_verify" | "password_reset";
  attempts: number;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
}

function getTokenDir(): string {
  const dir = path.join(process.cwd(), ".data", "tokens");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export class VerificationTokenRepository {
  private tokens: Map<string, VerificationTokenRecord> = new Map(); // id -> VerificationTokenRecord
  private hashIndex: Map<string, string> = new Map(); // tokenHash -> id

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      const tDir = getTokenDir();
      const files = fs.readdirSync(tDir).filter((f) => f.endsWith(".json"));
      for (const file of files) {
        const raw = fs.readFileSync(path.join(tDir, file), "utf-8");
        const parsed = JSON.parse(raw);
        const record: VerificationTokenRecord = {
          ...parsed,
          expiresAt: new Date(parsed.expiresAt),
          usedAt: parsed.usedAt ? new Date(parsed.usedAt) : null,
          createdAt: new Date(parsed.createdAt),
        };
        this.tokens.set(record.id, record);
        this.hashIndex.set(record.tokenHash, record.id);
      }
    } catch {}
  }

  private persistToken(token: VerificationTokenRecord): void {
    try {
      const tDir = getTokenDir();
      fs.writeFileSync(path.join(tDir, `${token.id}.json`), JSON.stringify(token, null, 2));
    } catch (err) {
      console.error("Failed to persist token to disk", err);
    }
  }

  public createToken(data: {
    tokenHash: string;
    identifier: string;
    tokenType: "email_verify" | "password_reset";
    expiresAt: Date;
  }): VerificationTokenRecord {
    this.loadFromDisk();
    const id = crypto.randomUUID();
    const token: VerificationTokenRecord = {
      id,
      tokenHash: data.tokenHash,
      identifier: data.identifier.toLowerCase().trim(),
      tokenType: data.tokenType,
      attempts: 0,
      expiresAt: data.expiresAt,
      usedAt: null,
      createdAt: new Date(),
    };

    this.tokens.set(id, token);
    this.hashIndex.set(data.tokenHash, id);
    this.persistToken(token);
    return token;
  }

  public findValidToken(tokenHash: string, tokenType: "email_verify" | "password_reset"): VerificationTokenRecord | null {
    this.loadFromDisk();
    const id = this.hashIndex.get(tokenHash);
    if (!id) return null;
    const token = this.tokens.get(id);
    if (!token) return null;

    if (token.tokenType !== tokenType) return null;
    if (token.usedAt) return null;
    if (token.expiresAt.getTime() < Date.now()) return null;
    if (token.attempts >= 5) return null; // Brute-force cap

    return token;
  }

  public incrementAttempts(tokenHash: string): void {
    this.loadFromDisk();
    const id = this.hashIndex.get(tokenHash);
    if (!id) return;
    const token = this.tokens.get(id);
    if (!token) return;

    token.attempts += 1;
    this.tokens.set(id, token);
    this.persistToken(token);
  }

  public markUsed(tokenHash: string): void {
    this.loadFromDisk();
    const id = this.hashIndex.get(tokenHash);
    if (!id) return;
    const token = this.tokens.get(id);
    if (!token) return;

    token.usedAt = new Date();
    this.tokens.set(id, token);
    this.persistToken(token);
  }

  public invalidateOlderTokens(identifier: string, tokenType: "email_verify" | "password_reset"): void {
    this.loadFromDisk();
    const norm = identifier.toLowerCase().trim();
    const now = new Date();
    for (const token of this.tokens.values()) {
      if (token.identifier === norm && token.tokenType === tokenType && !token.usedAt) {
        token.usedAt = now;
        this.persistToken(token);
      }
    }
  }

  public clearAll(): void {
    this.tokens.clear();
    this.hashIndex.clear();
    try {
      const tDir = getTokenDir();
      for (const f of fs.readdirSync(tDir)) fs.unlinkSync(path.join(tDir, f));
    } catch {}
  }
}

export const verificationTokenRepository = new VerificationTokenRepository();
