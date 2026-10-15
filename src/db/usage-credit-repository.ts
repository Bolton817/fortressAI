import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Fortress AI — AI Usage Credit Repository (TDD §11.4, §24.3, FR-070)
 * Persistent ledger for customer AI credit debits and platform failure refunds.
 */

export interface StoredUsageCreditRecord {
  id: string;
  userId: string;
  siteId: string;
  jobId: string;
  jobType: string;
  creditsDeducted: number;
  providerCostMinorUnits: number;
  currency: string;
  status: "debited" | "refunded";
  refundReason?: string;
  idempotencyKey: string;
  createdAt: string;
}

export class UsageCreditRepository {
  private records: Map<string, StoredUsageCreditRecord> = new Map();
  private userRecords: Map<string, Set<string>> = new Map();
  private jobRecords: Map<string, string> = new Map(); // jobId -> recordId
  private idempotencyIndex: Map<string, string> = new Map(); // idempotencyKey -> recordId
  private dataDir: string;

  constructor(customDataDir?: string) {
    this.dataDir =
      customDataDir || path.join(process.cwd(), ".data", "usage-credits");
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
          const rec = JSON.parse(content) as StoredUsageCreditRecord;
          this.indexRecord(rec);
        }
      }
    } catch {
      // Safe ignore
    }
  }

  private indexRecord(rec: StoredUsageCreditRecord) {
    this.records.set(rec.id, rec);
    this.jobRecords.set(rec.jobId, rec.id);
    this.idempotencyIndex.set(rec.idempotencyKey, rec.id);

    if (!this.userRecords.has(rec.userId)) {
      this.userRecords.set(rec.userId, new Set());
    }
    this.userRecords.get(rec.userId)!.add(rec.id);
  }

  private persist(rec: StoredUsageCreditRecord) {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(this.dataDir, `${rec.id}.json`),
        JSON.stringify(rec, null, 2),
        "utf-8"
      );
    } catch {
      // Memory fallback
    }
  }

  recordDebit(input: {
    userId: string;
    siteId: string;
    jobId: string;
    jobType: string;
    creditsDeducted: number;
    providerCostMinorUnits?: number;
    currency?: string;
    idempotencyKey: string;
  }): StoredUsageCreditRecord {
    // Idempotency check: duplicate job execution must not double-debit (FR-070)
    if (this.idempotencyIndex.has(input.idempotencyKey)) {
      const existingId = this.idempotencyIndex.get(input.idempotencyKey)!;
      return this.records.get(existingId)!;
    }

    const rec: StoredUsageCreditRecord = {
      id: randomUUID(),
      userId: input.userId,
      siteId: input.siteId,
      jobId: input.jobId,
      jobType: input.jobType,
      creditsDeducted: input.creditsDeducted,
      providerCostMinorUnits: input.providerCostMinorUnits || 0,
      currency: input.currency || "USD",
      status: "debited",
      idempotencyKey: input.idempotencyKey,
      createdAt: new Date().toISOString(),
    };

    this.indexRecord(rec);
    this.persist(rec);
    return rec;
  }

  refundCredits(jobId: string, reason: string): StoredUsageCreditRecord | null {
    const recordId = this.jobRecords.get(jobId);
    if (!recordId) return null;

    const record = this.records.get(recordId);
    if (!record || record.status === "refunded") return record || null;

    const updated: StoredUsageCreditRecord = {
      ...record,
      status: "refunded",
      refundReason: reason,
    };

    this.records.set(recordId, updated);
    this.persist(updated);
    return updated;
  }

  getRecordById(id: string): StoredUsageCreditRecord | null {
    return this.records.get(id) || null;
  }

  getRecordByJobId(jobId: string): StoredUsageCreditRecord | null {
    const id = this.jobRecords.get(jobId);
    if (!id) return null;
    return this.records.get(id) || null;
  }

  getByIdempotencyKey(key: string): StoredUsageCreditRecord | null {
    const id = this.idempotencyIndex.get(key);
    if (!id) return null;
    return this.records.get(id) || null;
  }

  listRecordsForUser(userId: string): StoredUsageCreditRecord[] {
    const recordIds = this.userRecords.get(userId);
    if (!recordIds) return [];

    const result: StoredUsageCreditRecord[] = [];
    for (const id of recordIds) {
      const r = this.records.get(id);
      if (r) result.push(r);
    }
    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getLedgerForUser(userId: string): StoredUsageCreditRecord[] {
    return this.listRecordsForUser(userId);
  }

  /**
   * Calculates net debited credits for a user within a specified period start date.
   * Net = debited credits minus refunded credits.
   */
  getNetCreditsUsedInPeriod(userId: string, periodStartIso: string): number {
    const userRecords = this.listRecordsForUser(userId);
    const periodStart = new Date(periodStartIso).getTime();

    let netUsed = 0;
    for (const r of userRecords) {
      const recordTime = new Date(r.createdAt).getTime();
      if (recordTime >= periodStart) {
        if (r.status === "debited") {
          netUsed += r.creditsDeducted;
        }
      }
    }
    return netUsed;
  }

  clearAll() {
    this.records.clear();
    this.userRecords.clear();
    this.jobRecords.clear();
    this.idempotencyIndex.clear();
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

export const usageCreditRepository = new UsageCreditRepository();
