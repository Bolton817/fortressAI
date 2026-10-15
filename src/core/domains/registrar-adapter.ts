/**
 * Fortress AI — Registrar Adapter Interface (TDD §22.2, FR-062, FR-063, FR-065, FR-066)
 */

export interface DomainSearchInput {
  domain: string;
}

export interface AvailabilityResult {
  domain: string;
  isAvailable: boolean;
  tld: string;
  currency: string;
  firstTermPriceCents: number;
  renewalPriceCents: number;
  minYears: number;
  maxYears: number;
  supported: boolean;
  reason?: string;
  policyNotes?: string;
  requiresAssistedRegistration?: boolean;
  timestamp: string;
}

export interface RegistrantContact {
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
  countryCode: string; // ISO-3166-1 alpha-2, e.g. "KE", "US", "GB"
}

export interface RegistrationRequest {
  domain: string;
  termYears: number;
  registrant: RegistrantContact;
  nameservers?: string[];
  privacyProtection?: boolean;
}

export interface RegistrationResult {
  success: boolean;
  domain: string;
  providerDomainId: string;
  registeredAt: string;
  expiresAt: string;
  termYears: number;
  nameservers: string[];
  receiptId: string;
  priceCents: number;
  currency: string;
  isAssistedRegistration?: boolean;
  rawResponse?: Record<string, unknown>;
}

export interface RegistrarDomainStatus {
  domain: string;
  status: "active" | "expired" | "locked" | "pending_transfer" | "redemption";
  registeredAt: string;
  expiresAt: string;
  autoRenew: boolean;
  nameservers: string[];
  isLocked: boolean;
  privacyProtection: boolean;
  registrant: RegistrantContact;
}

export interface RenewalRequest {
  domain: string;
  termYears: number;
}

export interface RenewalResult {
  success: boolean;
  domain: string;
  previousExpiresAt: string;
  newExpiresAt: string;
  termYears: number;
  priceCents: number;
  currency: string;
  receiptId: string;
}

export interface TransferRequest {
  domain: string;
  authCode?: string;
}

export interface TransferResult {
  success: boolean;
  domain: string;
  status: "initiated" | "pending_approval" | "completed" | "rejected";
  authCode?: string;
  message: string;
}

export interface RegistrarAdapter {
  checkAvailability(input: DomainSearchInput): Promise<AvailabilityResult>;
  quoteRegistration(domain: string, termYears?: number): Promise<AvailabilityResult>;
  registerDomain(input: RegistrationRequest, idempotencyKey: string): Promise<RegistrationResult>;
  getDomain(domain: string): Promise<RegistrarDomainStatus>;
  renewDomain(input: RenewalRequest, idempotencyKey: string): Promise<RenewalResult>;
  transferOut(input: TransferRequest): Promise<TransferResult>;
  getAuthCode(domain: string): Promise<string>;
  setLock(domain: string, isLocked: boolean): Promise<boolean>;
}
