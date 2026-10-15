import * as fs from "node:fs";
import * as path from "node:path";
import { ResourceNotFoundError } from "@/core/errors";

export interface UserRecord {
  id: string;
  emailNormalised: string;
  passwordHash?: string;
  displayName: string;
  phoneOptional?: string;
  emailVerifiedAt?: Date | null;
  status: "unverified" | "active" | "suspended" | "deleted";
  timezone: string;
  termsAcceptedAt?: Date | null;
  policyVersion?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountRecord {
  id: string;
  userId: string;
  provider: string; // e.g., "google"
  providerAccountId: string;
  scope?: string;
  createdAt: Date;
}

function getUserDir(): string {
  const dir = path.join(process.cwd(), ".data", "users");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getAccountsDir(): string {
  const dir = path.join(process.cwd(), ".data", "accounts");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export class UserRepository {
  private users: Map<string, UserRecord> = new Map();
  private emailIndex: Map<string, string> = new Map(); // emailNormalised -> userId
  private accounts: Map<string, AccountRecord> = new Map(); // accountId -> AccountRecord
  private providerIndex: Map<string, string> = new Map(); // `${provider}:${providerAccountId}` -> accountId

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      const uDir = getUserDir();
      const userFiles = fs.readdirSync(uDir).filter((f) => f.endsWith(".json"));
      for (const file of userFiles) {
        const raw = fs.readFileSync(path.join(uDir, file), "utf-8");
        const parsed = JSON.parse(raw);
        const record: UserRecord = {
          ...parsed,
          emailVerifiedAt: parsed.emailVerifiedAt ? new Date(parsed.emailVerifiedAt) : null,
          termsAcceptedAt: parsed.termsAcceptedAt ? new Date(parsed.termsAcceptedAt) : null,
          createdAt: new Date(parsed.createdAt),
          updatedAt: new Date(parsed.updatedAt),
        };
        this.users.set(record.id, record);
        this.emailIndex.set(record.emailNormalised, record.id);
      }

      const aDir = getAccountsDir();
      const accountFiles = fs.readdirSync(aDir).filter((f) => f.endsWith(".json"));
      for (const file of accountFiles) {
        const raw = fs.readFileSync(path.join(aDir, file), "utf-8");
        const parsed = JSON.parse(raw);
        const record: AccountRecord = {
          ...parsed,
          createdAt: new Date(parsed.createdAt),
        };
        this.accounts.set(record.id, record);
        this.providerIndex.set(`${record.provider}:${record.providerAccountId}`, record.id);
      }
    } catch {
      // safe fallback if filesystem read fails
    }
  }

  private persistUser(user: UserRecord): void {
    try {
      const uDir = getUserDir();
      fs.writeFileSync(path.join(uDir, `${user.id}.json`), JSON.stringify(user, null, 2));
    } catch (err) {
      console.error("Failed to persist user to disk", err);
    }
  }

  private persistAccount(account: AccountRecord): void {
    try {
      const aDir = getAccountsDir();
      fs.writeFileSync(path.join(aDir, `${account.id}.json`), JSON.stringify(account, null, 2));
    } catch (err) {
      console.error("Failed to persist account to disk", err);
    }
  }

  public createUser(data: {
    email: string;
    passwordHash?: string;
    displayName: string;
    phoneOptional?: string;
    timezone?: string;
    termsAcceptedAt?: Date;
    policyVersion?: string;
    status?: "unverified" | "active";
    emailVerifiedAt?: Date | null;
  }): UserRecord {
    this.loadFromDisk();
    const emailNorm = data.email.trim().toLowerCase();
    if (this.emailIndex.has(emailNorm)) {
      throw new Error(`User with email '${emailNorm}' already exists`);
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const user: UserRecord = {
      id,
      emailNormalised: emailNorm,
      passwordHash: data.passwordHash,
      displayName: data.displayName.trim(),
      phoneOptional: data.phoneOptional?.trim(),
      status: data.status || "unverified",
      emailVerifiedAt: data.emailVerifiedAt || null,
      timezone: data.timezone || "UTC",
      termsAcceptedAt: data.termsAcceptedAt || null,
      policyVersion: data.policyVersion || "1.0",
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(id, user);
    this.emailIndex.set(emailNorm, id);
    this.persistUser(user);
    return user;
  }

  public seedUser(user: UserRecord): void {
    this.users.set(user.id, user);
    this.emailIndex.set(user.emailNormalised, user.id);
    this.persistUser(user);
  }

  public findById(id: string): UserRecord | null {
    this.loadFromDisk();
    return this.users.get(id) || null;
  }

  public findByEmail(email: string): UserRecord | null {
    this.loadFromDisk();
    const emailNorm = email.trim().toLowerCase();
    const userId = this.emailIndex.get(emailNorm);
    if (!userId) return null;
    return this.users.get(userId) || null;
  }

  public updateUser(id: string, partial: Partial<Omit<UserRecord, "id" | "emailNormalised" | "createdAt">>): UserRecord {
    this.loadFromDisk();
    const existing = this.users.get(id);
    if (!existing) {
      throw new ResourceNotFoundError("User", id);
    }

    const updated: UserRecord = {
      ...existing,
      ...partial,
      updatedAt: new Date(),
    };

    this.users.set(id, updated);
    this.persistUser(updated);
    return updated;
  }

  public deleteUser(id: string): void {
    this.loadFromDisk();
    const user = this.users.get(id);
    if (!user) return;

    this.users.delete(id);
    this.emailIndex.delete(user.emailNormalised);

    try {
      const p = path.join(getUserDir(), `${id}.json`);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {}
  }

  public linkAccount(data: {
    userId: string;
    provider: string;
    providerAccountId: string;
    scope?: string;
  }): AccountRecord {
    this.loadFromDisk();
    const key = `${data.provider}:${data.providerAccountId}`;
    const existingAccountId = this.providerIndex.get(key);
    if (existingAccountId) {
      return this.accounts.get(existingAccountId)!;
    }

    const id = crypto.randomUUID();
    const account: AccountRecord = {
      id,
      userId: data.userId,
      provider: data.provider,
      providerAccountId: data.providerAccountId,
      scope: data.scope,
      createdAt: new Date(),
    };

    this.accounts.set(id, account);
    this.providerIndex.set(key, id);
    this.persistAccount(account);
    return account;
  }

  public findAccountByProvider(provider: string, providerAccountId: string): AccountRecord | null {
    this.loadFromDisk();
    const key = `${provider}:${providerAccountId}`;
    const accountId = this.providerIndex.get(key);
    if (!accountId) return null;
    return this.accounts.get(accountId) || null;
  }

  public findAccountsForUser(userId: string): AccountRecord[] {
    this.loadFromDisk();
    const results: AccountRecord[] = [];
    for (const acc of this.accounts.values()) {
      if (acc.userId === userId) {
        results.push(acc);
      }
    }
    return results;
  }

  public clearAll(): void {
    this.users.clear();
    this.emailIndex.clear();
    this.accounts.clear();
    this.providerIndex.clear();
    try {
      const uDir = getUserDir();
      for (const f of fs.readdirSync(uDir)) fs.unlinkSync(path.join(uDir, f));
      const aDir = getAccountsDir();
      for (const f of fs.readdirSync(aDir)) fs.unlinkSync(path.join(aDir, f));
    } catch {}
  }
}

export const userRepository = new UserRepository();
