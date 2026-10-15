import * as fs from "node:fs";
import * as path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";

/**
 * Fortress AI — Newsletter Consent & Suppression Repository (TDD §25.1, §25.2, FR-073, FR-074)
 * Records explicit opt-in evidence and ensures strict suppression upon unsubscribe.
 */

export interface StoredNewsletterConsent {
  id: string;
  userId?: string;
  email: string; // Normalised lowercase
  isSubscribed: boolean;
  consentSource: string; // "signup_checkbox" | "footer_form" | "account_settings"
  policyVersion: string;
  ipAddress?: string;
  consentedAt?: string;
  unsubscribedAt?: string;
  unsubscribeToken: string;
  suppressionReason?: string; // "user_unsubscribed" | "bounced" | "spam_complaint"
  createdAt: string;
  updatedAt: string;
}

export class NewsletterRepository {
  private consents: Map<string, StoredNewsletterConsent> = new Map();
  private emailIndex: Map<string, string> = new Map(); // email -> id
  private tokenIndex: Map<string, string> = new Map(); // token -> id
  private dataDir: string;

  constructor(customDataDir?: string) {
    this.dataDir =
      customDataDir || path.join(process.cwd(), ".data", "newsletter-consents");
    this.initStorage();
  }

  private initStorage() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      this.loadAll();
    } catch {
      // Memory fallback
    }
  }

  private loadAll() {
    try {
      if (!fs.existsSync(this.dataDir)) return;
      const files = fs.readdirSync(this.dataDir);
      for (const file of files) {
        if (file.endsWith(".json")) {
          const content = fs.readFileSync(path.join(this.dataDir, file), "utf-8");
          const c = JSON.parse(content) as StoredNewsletterConsent;
          this.indexConsent(c);
        }
      }
    } catch {
      // Safe ignore
    }
  }

  private indexConsent(c: StoredNewsletterConsent) {
    this.consents.set(c.id, c);
    this.emailIndex.set(c.email.toLowerCase(), c.id);
    this.tokenIndex.set(c.unsubscribeToken, c.id);
  }

  private persist(c: StoredNewsletterConsent) {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(this.dataDir, `${c.id}.json`),
        JSON.stringify(c, null, 2),
        "utf-8"
      );
    } catch {
      // Memory fallback
    }
  }

  recordOptIn(input: {
    email: string;
    userId?: string;
    consentSource: string;
    policyVersion: string;
    ipAddress?: string;
  }): StoredNewsletterConsent {
    const normEmail = input.email.trim().toLowerCase();
    const existingId = this.emailIndex.get(normEmail);
    const now = new Date().toISOString();

    if (existingId) {
      const existing = this.consents.get(existingId)!;
      const updated: StoredNewsletterConsent = {
        ...existing,
        userId: input.userId || existing.userId,
        isSubscribed: true,
        consentSource: input.consentSource,
        policyVersion: input.policyVersion,
        ipAddress: input.ipAddress || existing.ipAddress,
        consentedAt: now,
        unsubscribedAt: undefined,
        suppressionReason: undefined,
        updatedAt: now,
      };
      this.consents.set(existingId, updated);
      this.persist(updated);
      return updated;
    }

    const token = randomBytes(24).toString("hex");
    const consent: StoredNewsletterConsent = {
      id: randomUUID(),
      userId: input.userId,
      email: normEmail,
      isSubscribed: true,
      consentSource: input.consentSource,
      policyVersion: input.policyVersion,
      ipAddress: input.ipAddress,
      consentedAt: now,
      unsubscribeToken: token,
      createdAt: now,
      updatedAt: now,
    };

    this.indexConsent(consent);
    this.persist(consent);
    return consent;
  }

  recordUnsubscribe(
    tokenOrEmail: string,
    reason: string = "user_unsubscribed"
  ): StoredNewsletterConsent | null {
    let consent: StoredNewsletterConsent | undefined;

    // Check token first
    if (this.tokenIndex.has(tokenOrEmail)) {
      const id = this.tokenIndex.get(tokenOrEmail)!;
      consent = this.consents.get(id);
    } else {
      // Check email
      const norm = tokenOrEmail.trim().toLowerCase();
      if (this.emailIndex.has(norm)) {
        const id = this.emailIndex.get(norm)!;
        consent = this.consents.get(id);
      }
    }

    if (!consent) return null;

    const now = new Date().toISOString();
    const updated: StoredNewsletterConsent = {
      ...consent,
      isSubscribed: false,
      unsubscribedAt: now,
      suppressionReason: reason,
      updatedAt: now,
    };

    this.consents.set(consent.id, updated);
    this.persist(updated);
    return updated;
  }

  isSuppressed(email: string): boolean {
    const norm = email.trim().toLowerCase();
    const id = this.emailIndex.get(norm);
    if (!id) return false;

    const consent = this.consents.get(id);
    if (!consent) return false;

    // Suppressed if explicitly not subscribed or has a suppression reason
    return !consent.isSubscribed || Boolean(consent.suppressionReason);
  }

  getConsent(email: string): StoredNewsletterConsent | null {
    return this.getByEmail(email);
  }

  recordConsent(input: {
    email: string;
    userId?: string;
    status?: "subscribed" | "unsubscribed";
    optInSource?: string;
    consentSource?: string;
    policyVersion?: string;
    ipAddress?: string;
  }): StoredNewsletterConsent {
    if (input.status === "unsubscribed") {
      return this.recordUnsubscribe(input.email, "user_unsubscribed")!;
    }
    return this.recordOptIn({
      email: input.email,
      userId: input.userId,
      consentSource: input.optInSource || input.consentSource || "account_settings",
      policyVersion: input.policyVersion || "1.0",
      ipAddress: input.ipAddress,
    });
  }

  getByEmail(email: string): StoredNewsletterConsent | null {
    const norm = email.trim().toLowerCase();
    const id = this.emailIndex.get(norm);
    if (!id) return null;
    return this.consents.get(id) || null;
  }

  getByToken(token: string): StoredNewsletterConsent | null {
    const id = this.tokenIndex.get(token);
    if (!id) return null;
    return this.consents.get(id) || null;
  }

  listAll(): StoredNewsletterConsent[] {
    return Array.from(this.consents.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  clearAll() {
    this.consents.clear();
    this.emailIndex.clear();
    this.tokenIndex.clear();
    try {
      if (fs.existsSync(this.dataDir)) {
        const files = fs.readdirSync(this.dataDir);
        for (const file of files) {
          fs.unlinkSync(path.join(this.dataDir, file));
        }
      }
    } catch {
      // Safe ignore
    }
  }
}

export const newsletterRepository = new NewsletterRepository();
