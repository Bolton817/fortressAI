import { randomUUID, randomBytes } from "node:crypto";
import {
  RegistrarAdapter,
  DomainSearchInput,
  AvailabilityResult,
  RegistrationRequest,
  RegistrationResult,
  RegistrarDomainStatus,
  RenewalRequest,
  RenewalResult,
  TransferRequest,
  TransferResult,
  RegistrantContact,
} from "./registrar-adapter";
import { PricingCatalog } from "./pricing-catalog";
import { DomainValidator } from "./domain-validator";

/**
 * Fortress AI — High-Fidelity Mock Registrar Adapter (TDD §22.2, FR-062, FR-063, FR-065, FR-066)
 */

interface MockRegisteredDomain {
  domain: string;
  providerDomainId: string;
  termYears: number;
  registeredAt: string;
  expiresAt: string;
  registrant: RegistrantContact;
  nameservers: string[];
  isLocked: boolean;
  eppCode: string;
  receiptId: string;
}

export class MockRegistrarAdapter implements RegistrarAdapter {
  private registeredDomains: Map<string, MockRegisteredDomain> = new Map();
  private idempotencyCache: Map<string, RegistrationResult> = new Map();
  private renewalIdempotencyCache: Map<string, RenewalResult> = new Map();

  // Pre-seed known taken/reserved domains for testing
  private takenDomains = new Set([
    "google.com",
    "microsoft.com",
    "apple.com",
    "kenya.co.ke",
    "taken-domain.com",
    "safaris-taken.co.ke",
  ]);

  constructor() {
    // Seed an initial registered domain for test verification
    const seededDomain = "existing-tenant-site.com";
    this.registeredDomains.set(seededDomain, {
      domain: seededDomain,
      providerDomainId: "dom_mock_seeded_12345",
      termYears: 1,
      registeredAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 305 * 24 * 60 * 60 * 1000).toISOString(),
      registrant: {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@existing-tenant-site.com",
        phone: "+15551234567",
        addressLine1: "100 Market St",
        city: "San Francisco",
        postalCode: "94105",
        countryCode: "US",
      },
      nameservers: ["ns1.fortressdns.net", "ns2.fortressdns.net"],
      isLocked: true,
      eppCode: "EPP-SeedAuthCode99!",
      receiptId: "rcpt_mock_seed_001",
    });
  }

  public async checkAvailability(input: DomainSearchInput): Promise<AvailabilityResult> {
    const raw = input.domain;
    const validation = DomainValidator.validate(raw);

    if (!validation.isValid) {
      return {
        domain: raw,
        isAvailable: false,
        tld: "",
        currency: "USD",
        firstTermPriceCents: 0,
        renewalPriceCents: 0,
        minYears: 1,
        maxYears: 1,
        supported: false,
        reason: validation.error || "Invalid domain syntax",
        timestamp: new Date().toISOString(),
      };
    }

    const parsed = DomainValidator.parse(raw);
    const domain = parsed.domain;
    const tld = parsed.tld;

    const pricing = PricingCatalog.getPricing(tld);
    if (!pricing) {
      return {
        domain,
        isAvailable: false,
        tld,
        currency: "USD",
        firstTermPriceCents: 0,
        renewalPriceCents: 0,
        minYears: 1,
        maxYears: 1,
        supported: false,
        reason: `The TLD ".${tld}" is currently not supported for automated registration.`,
        timestamp: new Date().toISOString(),
      };
    }

    const isTaken = this.takenDomains.has(domain) || this.registeredDomains.has(domain);

    return {
      domain,
      isAvailable: !isTaken,
      tld,
      currency: pricing.currency,
      firstTermPriceCents: pricing.firstTermPriceCents,
      renewalPriceCents: pricing.renewalPriceCents,
      minYears: pricing.minYears,
      maxYears: pricing.maxYears,
      supported: true,
      reason: isTaken ? "Domain is already registered." : undefined,
      policyNotes: pricing.specialPolicy,
      timestamp: new Date().toISOString(),
    };
  }

  public async quoteRegistration(domain: string): Promise<AvailabilityResult> {
    return this.checkAvailability({ domain });
  }

  public async registerDomain(
    input: RegistrationRequest,
    idempotencyKey: string
  ): Promise<RegistrationResult> {
    // 1. Check idempotency cache (TDD §22.2, FR-063)
    if (this.idempotencyCache.has(idempotencyKey)) {
      return { ...this.idempotencyCache.get(idempotencyKey)! };
    }

    const domain = DomainValidator.normalize(input.domain);
    const parsed = DomainValidator.parse(domain);
    const pricing = PricingCatalog.getPricing(parsed.tld);

    if (!pricing) {
      throw new Error(`TLD ".${parsed.tld}" is not supported.`);
    }

    if (this.takenDomains.has(domain) || this.registeredDomains.has(domain)) {
      throw new Error(`Domain "${domain}" is not available for registration.`);
    }

    // Validate registrant
    if (!input.registrant.email || !input.registrant.firstName || !input.registrant.lastName) {
      throw new Error("Registrant first name, last name, and email are strictly required.");
    }

    const now = new Date();
    const termYears = input.termYears || 1;
    const expiry = new Date(now.getTime() + termYears * 365 * 24 * 60 * 60 * 1000);

    const providerDomainId = `dom_mock_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const receiptId = `rcpt_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const eppCode = `EPP-${randomBytes(6).toString("hex").toUpperCase()}!`;

    const registered: MockRegisteredDomain = {
      domain,
      providerDomainId,
      termYears,
      registeredAt: now.toISOString(),
      expiresAt: expiry.toISOString(),
      registrant: { ...input.registrant },
      nameservers: input.nameservers || ["ns1.fortressdns.net", "ns2.fortressdns.net"],
      isLocked: true,
      eppCode,
      receiptId,
    };

    this.registeredDomains.set(domain, registered);

    const result: RegistrationResult = {
      success: true,
      domain,
      providerDomainId,
      registeredAt: registered.registeredAt,
      expiresAt: registered.expiresAt,
      termYears,
      nameservers: registered.nameservers,
      receiptId,
      priceCents: pricing.firstTermPriceCents * termYears,
      currency: pricing.currency,
      rawResponse: {
        mockStatus: "SUCCESS",
        registrar: "FortressMockRegistryV1",
        eppStatus: ["clientTransferProhibited", "clientDeleteProhibited"],
      },
    };

    this.idempotencyCache.set(idempotencyKey, result);
    return result;
  }

  public async getDomain(rawDomain: string): Promise<RegistrarDomainStatus> {
    const domain = DomainValidator.normalize(rawDomain);
    const rec = this.registeredDomains.get(domain);

    if (!rec) {
      throw new Error(`Domain "${domain}" is not registered with this registrar.`);
    }

    return {
      domain: rec.domain,
      status: "active",
      registeredAt: rec.registeredAt,
      expiresAt: rec.expiresAt,
      autoRenew: true,
      nameservers: rec.nameservers,
      isLocked: rec.isLocked,
      privacyProtection: true,
      registrant: { ...rec.registrant },
    };
  }

  public async renewDomain(
    input: RenewalRequest,
    idempotencyKey: string
  ): Promise<RenewalResult> {
    if (this.renewalIdempotencyCache.has(idempotencyKey)) {
      return { ...this.renewalIdempotencyCache.get(idempotencyKey)! };
    }

    const domain = DomainValidator.normalize(input.domain);
    const rec = this.registeredDomains.get(domain);

    if (!rec) {
      throw new Error(`Domain "${domain}" not found for renewal.`);
    }

    const currentExpiry = new Date(rec.expiresAt);
    const termYears = input.termYears || 1;
    const newExpiry = new Date(currentExpiry.getTime() + termYears * 365 * 24 * 60 * 60 * 1000);

    rec.expiresAt = newExpiry.toISOString();
    this.registeredDomains.set(domain, rec);

    const parsed = DomainValidator.parse(domain);
    const pricing = PricingCatalog.getPricing(parsed.tld);
    const priceCents = (pricing?.renewalPriceCents ?? 1499) * termYears;

    const result: RenewalResult = {
      success: true,
      domain,
      previousExpiresAt: currentExpiry.toISOString(),
      newExpiresAt: newExpiry.toISOString(),
      termYears,
      priceCents,
      currency: pricing?.currency ?? "USD",
      receiptId: `rcpt_renew_${randomUUID().replace(/-/g, "").slice(0, 10)}`,
    };

    this.renewalIdempotencyCache.set(idempotencyKey, result);
    return result;
  }

  public async transferOut(input: TransferRequest): Promise<TransferResult> {
    const domain = DomainValidator.normalize(input.domain);
    const rec = this.registeredDomains.get(domain);

    if (!rec) {
      return {
        success: false,
        domain,
        status: "rejected",
        message: `Domain "${domain}" not found in registrar records.`,
      };
    }

    if (rec.isLocked) {
      return {
        success: false,
        domain,
        status: "rejected",
        message: "Domain transfer is blocked because the domain transfer lock is currently enabled. Unlock the domain first.",
      };
    }

    if (input.authCode && input.authCode !== rec.eppCode) {
      return {
        success: false,
        domain,
        status: "rejected",
        message: "Invalid transfer authorization code (EPP code).",
      };
    }

    return {
      success: true,
      domain,
      status: "initiated",
      authCode: rec.eppCode,
      message: "Transfer request initiated. A confirmation email has been dispatched to the registrant contact address.",
    };
  }

  public async getAuthCode(rawDomain: string): Promise<string> {
    const domain = DomainValidator.normalize(rawDomain);
    const rec = this.registeredDomains.get(domain);

    if (!rec) {
      throw new Error(`Domain "${domain}" is not registered.`);
    }

    return rec.eppCode;
  }

  public async setLock(rawDomain: string, isLocked: boolean): Promise<boolean> {
    const domain = DomainValidator.normalize(rawDomain);
    const rec = this.registeredDomains.get(domain);

    if (!rec) {
      throw new Error(`Domain "${domain}" is not registered.`);
    }

    rec.isLocked = isLocked;
    this.registeredDomains.set(domain, rec);
    return true;
  }

  /**
   * Reset mock registrar state (for unit testing)
   */
  public reset(): void {
    this.registeredDomains.clear();
    this.idempotencyCache.clear();
    this.renewalIdempotencyCache.clear();
  }
}

export const mockRegistrarAdapter = new MockRegistrarAdapter();
