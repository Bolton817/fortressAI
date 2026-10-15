import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Fortress AI — Subscription Repository (TDD §8, §24.1, §24.4, FR-069)
 * Handles customer plan state, billing intervals, renewals, and lifecycle status.
 */

export type SubscriptionStatus =
  | "trial"
  | "active"
  | "past_due"
  | "cancel_at_period_end"
  | "cancelled"
  | "expired";

export type BillingInterval = "monthly" | "annual";

export interface StoredSubscription {
  id: string;
  userId: string;
  planId: string; // "free" | "starter" | "pro" | "business"
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  currency: string; // "USD" | "KES"
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  providerSubscriptionId?: string;
  providerCustomerId?: string;
  paymentMethodType?: "card" | "mpesa";
  paymentMethodDetails?: {
    brand?: string;
    last4?: string;
    phone?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export class SubscriptionRepository {
  private subscriptions: Map<string, StoredSubscription> = new Map();
  private userSubscriptions: Map<string, Set<string>> = new Map();
  private dataDir: string;

  constructor(customDataDir?: string) {
    this.dataDir =
      customDataDir || path.join(process.cwd(), ".data", "subscriptions");
    this.initStorage();
  }

  private initStorage() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      this.loadAll();
    } catch {
      // Memory fallback if filesystem restricted
    }
  }

  private loadAll() {
    try {
      if (!fs.existsSync(this.dataDir)) return;
      const files = fs.readdirSync(this.dataDir);
      for (const file of files) {
        if (file.endsWith(".json")) {
          const content = fs.readFileSync(path.join(this.dataDir, file), "utf-8");
          const sub = JSON.parse(content) as StoredSubscription;
          this.indexSubscription(sub);
        }
      }
    } catch {
      // Fail safely to memory
    }
  }

  private indexSubscription(sub: StoredSubscription) {
    this.subscriptions.set(sub.id, sub);
    if (!this.userSubscriptions.has(sub.userId)) {
      this.userSubscriptions.set(sub.userId, new Set());
    }
    this.userSubscriptions.get(sub.userId)!.add(sub.id);
  }

  private persist(sub: StoredSubscription) {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(this.dataDir, `${sub.id}.json`),
        JSON.stringify(sub, null, 2),
        "utf-8"
      );
    } catch {
      // Memory fallback
    }
  }

  createSubscription(input: {
    userId: string;
    planId: string;
    billingInterval?: BillingInterval;
    currency?: string;
    durationDays?: number;
    providerSubscriptionId?: string;
    providerCustomerId?: string;
    paymentMethodType?: "card" | "mpesa";
    paymentMethodDetails?: { brand?: string; last4?: string; phone?: string };
    status?: SubscriptionStatus;
  }): StoredSubscription {
    const now = new Date();
    const durationDays =
      input.durationDays || (input.billingInterval === "annual" ? 365 : 30);
    const periodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const sub: StoredSubscription = {
      id: randomUUID(),
      userId: input.userId,
      planId: input.planId,
      status: input.status || "active",
      billingInterval: input.billingInterval || "monthly",
      currency: input.currency || "USD",
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
      providerSubscriptionId: input.providerSubscriptionId,
      providerCustomerId: input.providerCustomerId,
      paymentMethodType: input.paymentMethodType,
      paymentMethodDetails: input.paymentMethodDetails,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.indexSubscription(sub);
    this.persist(sub);
    return sub;
  }

  getSubscriptionById(id: string): StoredSubscription | null {
    return this.subscriptions.get(id) || null;
  }

  getActiveSubscriptionForUser(userId: string): StoredSubscription | null {
    const subIds = this.userSubscriptions.get(userId);
    if (!subIds) return null;

    for (const id of subIds) {
      const sub = this.subscriptions.get(id);
      if (
        sub &&
        (sub.status === "active" ||
          sub.status === "trial" ||
          sub.status === "cancel_at_period_end" ||
          sub.status === "past_due")
      ) {
        return sub;
      }
    }
    return null;
  }

  listSubscriptionsForUser(userId: string): StoredSubscription[] {
    const subIds = this.userSubscriptions.get(userId);
    if (!subIds) return [];

    const result: StoredSubscription[] = [];
    for (const id of subIds) {
      const sub = this.subscriptions.get(id);
      if (sub) result.push(sub);
    }
    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  updateSubscription(
    id: string,
    updates: Partial<StoredSubscription>
  ): StoredSubscription | null {
    const sub = this.subscriptions.get(id);
    if (!sub) return null;

    const updated: StoredSubscription = {
      ...sub,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.subscriptions.set(id, updated);
    this.persist(updated);
    return updated;
  }

  cancelSubscription(id: string, atPeriodEnd: boolean = true): StoredSubscription | null {
    const sub = this.subscriptions.get(id);
    if (!sub) return null;

    const now = new Date().toISOString();
    return this.updateSubscription(id, {
      cancelAtPeriodEnd: atPeriodEnd,
      status: atPeriodEnd ? "cancel_at_period_end" : "cancelled",
      canceledAt: now,
    });
  }

  reactivateSubscription(id: string): StoredSubscription | null {
    const sub = this.subscriptions.get(id);
    if (!sub) return null;

    return this.updateSubscription(id, {
      cancelAtPeriodEnd: false,
      status: "active",
      canceledAt: undefined,
    });
  }

  renewSubscription(id: string, additionalDays: number = 30): StoredSubscription | null {
    const sub = this.subscriptions.get(id);
    if (!sub) return null;

    const currentEnd = new Date(sub.currentPeriodEnd).getTime();
    const baseTime = currentEnd > Date.now() ? currentEnd : Date.now();
    const newEnd = new Date(baseTime + additionalDays * 24 * 60 * 60 * 1000);

    return this.updateSubscription(id, {
      status: "active",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: newEnd.toISOString(),
    });
  }

  clearAll() {
    this.subscriptions.clear();
    this.userSubscriptions.clear();
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

export const subscriptionRepository = new SubscriptionRepository();
