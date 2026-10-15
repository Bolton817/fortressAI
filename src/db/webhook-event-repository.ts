import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Fortress AI — Payment Webhook Event Repository (TDD §24.2, §27.2, FR-068)
 * Guarantees idempotency and replay protection for incoming provider webhooks.
 */

export interface StoredWebhookEvent {
  id: string;
  provider: string; // "intasend" | "stripe" | "mock"
  providerEventId: string;
  eventType: string;
  payloadJson: Record<string, unknown>;
  signature?: string;
  status: "processed" | "ignored" | "failed";
  errorMessage?: string;
  processedAt?: string;
  createdAt: string;
}

export class WebhookEventRepository {
  private events: Map<string, StoredWebhookEvent> = new Map();
  private providerEventIndex: Map<string, string> = new Map(); // providerEventId -> id
  private dataDir: string;

  constructor(customDataDir?: string) {
    this.dataDir =
      customDataDir || path.join(process.cwd(), ".data", "webhook-events");
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
          const ev = JSON.parse(content) as StoredWebhookEvent;
          this.indexEvent(ev);
        }
      }
    } catch {
      // Safe ignore
    }
  }

  private indexEvent(ev: StoredWebhookEvent) {
    this.events.set(ev.id, ev);
    this.providerEventIndex.set(ev.providerEventId, ev.id);
  }

  private persist(ev: StoredWebhookEvent) {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(this.dataDir, `${ev.id}.json`),
        JSON.stringify(ev, null, 2),
        "utf-8"
      );
    } catch {
      // Memory fallback
    }
  }

  recordEvent(input: {
    provider: string;
    providerEventId: string;
    eventType: string;
    payloadJson: Record<string, unknown>;
    signature?: string;
    status?: "processed" | "ignored" | "failed";
  }): { event: StoredWebhookEvent; isDuplicate: boolean } {
    // Deduplication check (FR-068, TDD §27.2)
    if (this.providerEventIndex.has(input.providerEventId)) {
      const existingId = this.providerEventIndex.get(input.providerEventId)!;
      return { event: this.events.get(existingId)!, isDuplicate: true };
    }

    const now = new Date().toISOString();
    const ev: StoredWebhookEvent = {
      id: randomUUID(),
      provider: input.provider,
      providerEventId: input.providerEventId,
      eventType: input.eventType,
      payloadJson: input.payloadJson,
      signature: input.signature,
      status: input.status || "processed",
      processedAt: input.status === "processed" ? now : undefined,
      createdAt: now,
    };

    this.indexEvent(ev);
    this.persist(ev);
    return { event: ev, isDuplicate: false };
  }

  getByProviderEventId(providerEventId: string): StoredWebhookEvent | null {
    const id = this.providerEventIndex.get(providerEventId);
    if (!id) return null;
    return this.events.get(id) || null;
  }

  markProcessed(id: string): StoredWebhookEvent | null {
    const ev = this.events.get(id);
    if (!ev) return null;

    const updated: StoredWebhookEvent = {
      ...ev,
      status: "processed",
      processedAt: new Date().toISOString(),
    };

    this.events.set(id, updated);
    this.persist(updated);
    return updated;
  }

  markFailed(id: string, errorMessage: string): StoredWebhookEvent | null {
    const ev = this.events.get(id);
    if (!ev) return null;

    const updated: StoredWebhookEvent = {
      ...ev,
      status: "failed",
      errorMessage,
    };

    this.events.set(id, updated);
    this.persist(updated);
    return updated;
  }

  listAll(): StoredWebhookEvent[] {
    return Array.from(this.events.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  clearAll() {
    this.events.clear();
    this.providerEventIndex.clear();
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

export const webhookEventRepository = new WebhookEventRepository();
