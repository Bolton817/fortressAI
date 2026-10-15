import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Fortress AI — Invoice & Receipt Repository (TDD §24.2, §26.2, FR-071)
 * Invariant: Financial amounts are stored as integer minor units + currency.
 */

export interface InvoiceLineItem {
  description: string;
  amountMinorUnits: number; // In cents / minor units
  quantity: number;
  category: "subscription" | "domain" | "addon";
}

export interface BillingCustomerDetails {
  name?: string;
  email?: string;
  address?: string;
  phone?: string;
  taxId?: string;
}

export interface StoredInvoice {
  id: string;
  invoiceNumber: string; // e.g. "INV-2026-10001"
  userId: string;
  subscriptionId?: string;
  amountMinorUnits: number;
  currency: string;
  status: "paid" | "open" | "void" | "uncollectible";
  lineItemsJson: InvoiceLineItem[];
  billingDetailsJson?: BillingCustomerDetails;
  providerPaymentId?: string;
  idempotencyKey?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export class InvoiceRepository {
  private invoices: Map<string, StoredInvoice> = new Map();
  private userInvoices: Map<string, Set<string>> = new Map();
  private invoiceNumbers: Map<string, string> = new Map(); // number -> id
  private idempotencyIndex: Map<string, string> = new Map(); // idempotencyKey -> id
  private dataDir: string;
  private seqCounter: number = 10000;

  constructor(customDataDir?: string) {
    this.dataDir =
      customDataDir || path.join(process.cwd(), ".data", "invoices");
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
          const inv = JSON.parse(content) as StoredInvoice;
          this.indexInvoice(inv);
        }
      }
    } catch {
      // Safe ignore
    }
  }

  private indexInvoice(inv: StoredInvoice) {
    this.invoices.set(inv.id, inv);
    this.invoiceNumbers.set(inv.invoiceNumber, inv.id);

    if (inv.idempotencyKey) {
      this.idempotencyIndex.set(inv.idempotencyKey, inv.id);
    }

    if (!this.userInvoices.has(inv.userId)) {
      this.userInvoices.set(inv.userId, new Set());
    }
    this.userInvoices.get(inv.userId)!.add(inv.id);

    // Track sequence counter
    const numPart = parseInt(inv.invoiceNumber.replace(/^INV-\d{4}-/, ""), 10);
    if (!isNaN(numPart) && numPart >= this.seqCounter) {
      this.seqCounter = numPart + 1;
    }
  }

  private persist(inv: StoredInvoice) {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(this.dataDir, `${inv.id}.json`),
        JSON.stringify(inv, null, 2),
        "utf-8"
      );
    } catch {
      // Memory fallback
    }
  }

  private generateInvoiceNumber(): string {
    const year = new Date().getUTCFullYear();
    this.seqCounter += 1;
    return `INV-${year}-${this.seqCounter}`;
  }

  createInvoice(input: {
    userId: string;
    subscriptionId?: string;
    amountMinorUnits: number;
    currency?: string;
    lineItems: InvoiceLineItem[];
    billingDetails?: BillingCustomerDetails;
    providerPaymentId?: string;
    idempotencyKey?: string;
    status?: "paid" | "open" | "void" | "uncollectible";
    paidAt?: string;
  }): StoredInvoice {
    // Idempotency check
    if (input.idempotencyKey && this.idempotencyIndex.has(input.idempotencyKey)) {
      const existingId = this.idempotencyIndex.get(input.idempotencyKey)!;
      return this.invoices.get(existingId)!;
    }

    const now = new Date().toISOString();
    const invoiceNumber = this.generateInvoiceNumber();

    const inv: StoredInvoice = {
      id: randomUUID(),
      invoiceNumber,
      userId: input.userId,
      subscriptionId: input.subscriptionId,
      amountMinorUnits: input.amountMinorUnits,
      currency: input.currency || "USD",
      status: input.status || "paid",
      lineItemsJson: input.lineItems,
      billingDetailsJson: input.billingDetails,
      providerPaymentId: input.providerPaymentId,
      idempotencyKey: input.idempotencyKey,
      paidAt: input.paidAt || (input.status !== "open" ? now : undefined),
      createdAt: now,
      updatedAt: now,
    };

    this.indexInvoice(inv);
    this.persist(inv);
    return inv;
  }

  getInvoiceById(id: string): StoredInvoice | null {
    return this.invoices.get(id) || null;
  }

  getInvoiceByNumber(invoiceNumber: string): StoredInvoice | null {
    const id = this.invoiceNumbers.get(invoiceNumber);
    if (!id) return null;
    return this.invoices.get(id) || null;
  }

  getByIdempotencyKey(key: string): StoredInvoice | null {
    const id = this.idempotencyIndex.get(key);
    if (!id) return null;
    return this.invoices.get(id) || null;
  }

  listInvoicesForUser(userId: string): StoredInvoice[] {
    const invIds = this.userInvoices.get(userId);
    if (!invIds) return [];

    const result: StoredInvoice[] = [];
    for (const id of invIds) {
      const inv = this.invoices.get(id);
      if (inv) result.push(inv);
    }
    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  listAllInvoices(): StoredInvoice[] {
    return Array.from(this.invoices.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  updateInvoiceStatus(
    id: string,
    status: "paid" | "open" | "void" | "uncollectible",
    paidAt?: string
  ): StoredInvoice | null {
    const inv = this.invoices.get(id);
    if (!inv) return null;

    const updated: StoredInvoice = {
      ...inv,
      status,
      paidAt: paidAt || (status === "paid" && !inv.paidAt ? new Date().toISOString() : inv.paidAt),
      updatedAt: new Date().toISOString(),
    };

    this.invoices.set(id, updated);
    this.persist(updated);
    return updated;
  }

  clearAll() {
    this.invoices.clear();
    this.userInvoices.clear();
    this.invoiceNumbers.clear();
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

export const invoiceRepository = new InvoiceRepository();
