import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Fortress AI — Domain Order & Registration Repository (TDD §22, §24, FR-063, FR-065)
 */

export interface RegistrantDetails {
  firstName: string;
  lastName: string;
  organization?: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateOrRegion?: string;
  postalCode: string;
  countryCode: string;
}

export interface DomainOrderReceipt {
  receiptId: string;
  invoiceNumber: string;
  domainName: string;
  termYears: number;
  priceCents: number;
  currency: string;
  renewalPriceCents: number;
  paidAt: string;
  paymentMethod: string;
  registeredTo: string;
}

export interface StoredDomainOrder {
  id: string;
  siteId: string;
  userId: string;
  domainName: string;
  tld: string;
  termYears: number;
  priceCents: number;
  currency: string;
  renewalPriceCents: number;
  idempotencyKey: string;
  orderStatus: "pending" | "completed" | "failed" | "refunded";
  providerOrderId?: string;
  registrantJson: RegistrantDetails;
  receiptJson?: DomainOrderReceipt;
  expiresAt?: string;
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
}

export class DomainOrderRepository {
  private orders: Map<string, StoredDomainOrder> = new Map(); // id -> StoredDomainOrder
  private siteOrders: Map<string, Set<string>> = new Map(); // siteId -> Set<orderId>
  private userOrders: Map<string, Set<string>> = new Map(); // userId -> Set<orderId>
  private idempotencyIndex: Map<string, string> = new Map(); // idempotencyKey -> orderId
  private domainIndex: Map<string, string> = new Map(); // domainName -> orderId

  private getOrdersDir(): string {
    const dir = path.join(process.cwd(), ".data", "domain-orders");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  private loadAllFromDisk(): void {
    try {
      const dir = this.getOrdersDir();
      if (!fs.existsSync(dir)) return;

      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.endsWith(".json")) {
          const raw = fs.readFileSync(path.join(dir, file), "utf8");
          const order = JSON.parse(raw) as StoredDomainOrder;
          if (order && order.id) {
            this.orders.set(order.id, order);
            this.idempotencyIndex.set(order.idempotencyKey, order.id);
            this.domainIndex.set(order.domainName.toLowerCase(), order.id);

            if (!this.siteOrders.has(order.siteId)) {
              this.siteOrders.set(order.siteId, new Set());
            }
            this.siteOrders.get(order.siteId)!.add(order.id);

            if (!this.userOrders.has(order.userId)) {
              this.userOrders.set(order.userId, new Set());
            }
            this.userOrders.get(order.userId)!.add(order.id);
          }
        }
      }
    } catch {}
  }

  private persistOrderToDisk(order: StoredDomainOrder): void {
    try {
      const dir = this.getOrdersDir();
      const safeFilename = `${order.id}.json`;
      fs.writeFileSync(path.join(dir, safeFilename), JSON.stringify(order, null, 2), "utf8");
    } catch {}
  }

  constructor() {
    this.loadAllFromDisk();
  }

  /**
   * Create a new domain order or return existing order if idempotency key matches
   */
  public createOrder(data: {
    siteId: string;
    userId: string;
    domainName: string;
    tld: string;
    termYears?: number;
    priceCents: number;
    currency?: string;
    renewalPriceCents: number;
    idempotencyKey: string;
    registrant: RegistrantDetails;
    autoRenew?: boolean;
    providerOrderId?: string;
    orderStatus?: "pending" | "completed" | "failed" | "refunded";
    receiptJson?: DomainOrderReceipt;
    expiresAt?: string;
  }): StoredDomainOrder {
    // Idempotency check
    const existingOrderId = this.idempotencyIndex.get(data.idempotencyKey);
    if (existingOrderId) {
      const existing = this.orders.get(existingOrderId);
      if (existing) {
        return { ...existing };
      }
    }

    const now = new Date().toISOString();
    const order: StoredDomainOrder = {
      id: randomUUID(),
      siteId: data.siteId,
      userId: data.userId,
      domainName: data.domainName.toLowerCase().trim(),
      tld: data.tld.toLowerCase().trim(),
      termYears: data.termYears ?? 1,
      priceCents: data.priceCents,
      currency: data.currency ?? "USD",
      renewalPriceCents: data.renewalPriceCents,
      idempotencyKey: data.idempotencyKey,
      orderStatus: data.orderStatus ?? "pending",
      providerOrderId: data.providerOrderId,
      registrantJson: data.registrant,
      receiptJson: data.receiptJson,
      expiresAt: data.expiresAt,
      autoRenew: data.autoRenew ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.orders.set(order.id, order);
    this.idempotencyIndex.set(order.idempotencyKey, order.id);
    this.domainIndex.set(order.domainName, order.id);

    if (!this.siteOrders.has(order.siteId)) {
      this.siteOrders.set(order.siteId, new Set());
    }
    this.siteOrders.get(order.siteId)!.add(order.id);

    if (!this.userOrders.has(order.userId)) {
      this.userOrders.set(order.userId, new Set());
    }
    this.userOrders.get(order.userId)!.add(order.id);

    this.persistOrderToDisk(order);
    return { ...order };
  }

  public getOrderById(id: string): StoredDomainOrder | null {
    const order = this.orders.get(id);
    return order ? { ...order } : null;
  }

  public getByIdempotencyKey(key: string): StoredDomainOrder | null {
    const id = this.idempotencyIndex.get(key);
    if (!id) return null;
    return this.getOrderById(id);
  }

  public getOrderByDomain(domain: string): StoredDomainOrder | null {
    const id = this.domainIndex.get(domain.toLowerCase().trim());
    if (!id) return null;
    return this.getOrderById(id);
  }

  public listOrdersForSite(siteId: string): StoredDomainOrder[] {
    const ids = this.siteOrders.get(siteId);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.orders.get(id)!)
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((o) => ({ ...o }));
  }

  public listOrdersForUser(userId: string): StoredDomainOrder[] {
    const ids = this.userOrders.get(userId);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.orders.get(id)!)
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((o) => ({ ...o }));
  }

  public listAllOrders(): StoredDomainOrder[] {
    return Array.from(this.orders.values()).map((o) => ({ ...o }));
  }

  public updateOrderStatus(
    orderId: string,
    updates: {
      orderStatus: "pending" | "completed" | "failed" | "refunded";
      providerOrderId?: string;
      receiptJson?: DomainOrderReceipt;
      expiresAt?: string;
    }
  ): StoredDomainOrder {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Domain order with ID "${orderId}" not found.`);
    }

    const updated: StoredDomainOrder = {
      ...order,
      orderStatus: updates.orderStatus,
      providerOrderId: updates.providerOrderId ?? order.providerOrderId,
      receiptJson: updates.receiptJson ?? order.receiptJson,
      expiresAt: updates.expiresAt ?? order.expiresAt,
      updatedAt: new Date().toISOString(),
    };

    this.orders.set(orderId, updated);
    this.persistOrderToDisk(updated);
    return { ...updated };
  }

  public clearAll(): void {
    this.orders.clear();
    this.siteOrders.clear();
    this.userOrders.clear();
    this.idempotencyIndex.clear();
    this.domainIndex.clear();
    try {
      const dir = this.getOrdersDir();
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch {}
  }
}

export const domainOrderRepository = new DomainOrderRepository();
