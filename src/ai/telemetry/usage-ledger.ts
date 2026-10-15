import { randomUUID } from "node:crypto";
import { AIUsageRecord } from "../providers/types";

/**
 * Fortress AI — AI Usage & Cost Accounting Ledger (TDD §11.4, FR-070)
 * Invariant: Every chargeable action has a stable idempotency key.
 * A retry of the same job should not produce duplicate billing ledger entries.
 */

export interface AIUsageEvent {
  id: string;
  siteId: string;
  userId?: string;
  jobId: string;
  stage: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostMinorUnits: number; // In cents / minor currency units
  currency: string;
  durationMs: number;
  outcome: "succeeded" | "failed" | "repaired";
  idempotencyKey: string;
  createdAt: string;
}

export class UsageLedger {
  private events: AIUsageEvent[] = [];
  private idempotencyIndex: Map<string, AIUsageEvent> = new Map();

  recordUsage(params: {
    siteId: string;
    userId?: string;
    jobId: string;
    stage: string;
    provider: string;
    model: string;
    usage: AIUsageRecord;
    outcome: "succeeded" | "failed" | "repaired";
    idempotencyKey: string;
  }): AIUsageEvent {
    // 1. Idempotency Check (FR-077, TDD §11.4)
    if (this.idempotencyIndex.has(params.idempotencyKey)) {
      // Existing event found; update outcome if needed and return existing without duplicate debit
      const existing = this.idempotencyIndex.get(params.idempotencyKey)!;
      existing.outcome = params.outcome;
      return existing;
    }

    const event: AIUsageEvent = {
      id: randomUUID(),
      siteId: params.siteId,
      userId: params.userId,
      jobId: params.jobId,
      stage: params.stage,
      provider: params.provider,
      model: params.model,
      promptTokens: params.usage.promptTokens,
      completionTokens: params.usage.completionTokens,
      totalTokens: params.usage.totalTokens,
      estimatedCostMinorUnits: params.usage.estimatedCostMinorUnits,
      currency: "USD",
      durationMs: params.usage.durationMs,
      outcome: params.outcome,
      idempotencyKey: params.idempotencyKey,
      createdAt: new Date().toISOString(),
    };

    this.events.push(event);
    this.idempotencyIndex.set(params.idempotencyKey, event);
    return event;
  }

  getEventsBySite(siteId: string): AIUsageEvent[] {
    return this.events.filter((e) => e.siteId === siteId);
  }

  getSummaryBySite(siteId: string): {
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    totalCostMinorUnits: number;
    eventCount: number;
  } {
    const siteEvents = this.getEventsBySite(siteId);
    return siteEvents.reduce(
      (acc, ev) => {
        acc.totalPromptTokens += ev.promptTokens;
        acc.totalCompletionTokens += ev.completionTokens;
        acc.totalTokens += ev.totalTokens;
        acc.totalCostMinorUnits += ev.estimatedCostMinorUnits;
        acc.eventCount += 1;
        return acc;
      },
      {
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalTokens: 0,
        totalCostMinorUnits: 0,
        eventCount: 0,
      }
    );
  }

  clear() {
    this.events = [];
    this.idempotencyIndex.clear();
  }
}

export const globalUsageLedger = new UsageLedger();
