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
import { MockRegistrarAdapter } from "./mock-registrar-adapter";
import { DomainValidator } from "./domain-validator";

/**
 * Fortress AI — Kenya Registry Adapter (.co.ke, .ke, .or.ke)
 * Conforming to KeNIC guidelines and TDD Risk R-03 requirements.
 */

export class KenyaRegistryAdapter implements RegistrarAdapter {
  private baseAdapter: MockRegistrarAdapter;
  private apiAutomationEnabled: boolean;

  constructor(baseAdapter?: MockRegistrarAdapter, apiAutomationEnabled: boolean = true) {
    this.baseAdapter = baseAdapter || new MockRegistrarAdapter();
    this.apiAutomationEnabled = apiAutomationEnabled;
  }

  /**
   * Normalize Kenyan phone numbers to E.164 format (+254...)
   */
  public static normalizeKenyanPhone(phone: string): { isValid: boolean; normalized?: string; error?: string } {
    const clean = phone.replace(/[\s\-()]/g, "");

    // 07XXXXXXXX or 01XXXXXXXX
    if (/^(07\d{8}|01\d{8})$/.test(clean)) {
      return { isValid: true, normalized: `+254${clean.slice(1)}` };
    }

    // 2547XXXXXXXX or 2541XXXXXXXX
    if (/^254(7\d{8}|1\d{8})$/.test(clean)) {
      return { isValid: true, normalized: `+${clean}` };
    }

    // +2547XXXXXXXX or +2541XXXXXXXX
    if (/^\+254(7\d{8}|1\d{8})$/.test(clean)) {
      return { isValid: true, normalized: clean };
    }

    // If international format, allow if length >= 10
    if (/^\+\d{10,15}$/.test(clean)) {
      return { isValid: true, normalized: clean };
    }

    return {
      isValid: false,
      error: "Phone number must be a valid Kenyan mobile number (e.g. 0712345678 or +254712345678) or international E.164 format.",
    };
  }

  /**
   * Validate KeNIC registrant eligibility
   */
  public validateKenyanRegistrant(contact: RegistrantContact, tld: string): { isValid: boolean; error?: string } {
    if (!contact.firstName || !contact.lastName) {
      return { isValid: false, error: "Registrant contact requires valid first and last name." };
    }

    if (!contact.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
      return { isValid: false, error: "Valid registrant email address is required for KeNIC domain registration." };
    }

    const phoneCheck = KenyaRegistryAdapter.normalizeKenyanPhone(contact.phone);
    if (!phoneCheck.isValid) {
      return { isValid: false, error: phoneCheck.error };
    }

    // Specialized checks for restricted .ke sub-domains
    if (tld === "go.ke") {
      return { isValid: false, error: ".go.ke domains are reserved strictly for authorized Government of Kenya agencies." };
    }
    if (tld === "ac.ke" && !contact.organization) {
      return { isValid: false, error: ".ac.ke domains require an accredited tertiary institution or university name." };
    }

    return { isValid: true };
  }

  public async checkAvailability(input: DomainSearchInput): Promise<AvailabilityResult> {
    const res = await this.baseAdapter.checkAvailability(input);
    if (!res.supported) return res;

    const parsed = DomainValidator.parse(input.domain);
    const isKenyaTld = ["co.ke", "ke", "or.ke", "ac.ke", "sc.ke", "me.ke"].includes(parsed.tld);

    if (isKenyaTld) {
      res.policyNotes = "Managed under KeNIC policies. Fast local DNS propagation across Kenyan IXPs (KIXP).";
      res.requiresAssistedRegistration = !this.apiAutomationEnabled;

      if (!this.apiAutomationEnabled) {
        res.policyNotes += " Note: Automated API registration is currently undergoing partner validation (Risk R-03); assisted registration workflow active.";
      }
    }

    return res;
  }

  public async quoteRegistration(domain: string): Promise<AvailabilityResult> {
    return this.checkAvailability({ domain });
  }

  public async registerDomain(
    input: RegistrationRequest,
    idempotencyKey: string
  ): Promise<RegistrationResult> {
    const parsed = DomainValidator.parse(input.domain);
    const validation = this.validateKenyanRegistrant(input.registrant, parsed.tld);

    if (!validation.isValid) {
      throw new Error(`KeNIC Registration Validation Failed: ${validation.error}`);
    }

    // Normalize phone number before forwarding
    const phoneCheck = KenyaRegistryAdapter.normalizeKenyanPhone(input.registrant.phone);
    const normalizedRegistrant = {
      ...input.registrant,
      phone: phoneCheck.normalized || input.registrant.phone,
    };

    const res = await this.baseAdapter.registerDomain(
      {
        ...input,
        registrant: normalizedRegistrant,
      },
      idempotencyKey
    );

    // If API automation is restricted, flag as assisted registration
    if (!this.apiAutomationEnabled) {
      res.isAssistedRegistration = true;
      res.rawResponse = {
        ...res.rawResponse,
        kenicWorkflow: "assisted_provisioning_queue",
        slaHours: 4,
      };
    }

    return res;
  }

  public async getDomain(domain: string): Promise<RegistrarDomainStatus> {
    return this.baseAdapter.getDomain(domain);
  }

  public async renewDomain(input: RenewalRequest, idempotencyKey: string): Promise<RenewalResult> {
    return this.baseAdapter.renewDomain(input, idempotencyKey);
  }

  public async transferOut(input: TransferRequest): Promise<TransferResult> {
    return this.baseAdapter.transferOut(input);
  }

  public async getAuthCode(domain: string): Promise<string> {
    return this.baseAdapter.getAuthCode(domain);
  }

  public async setLock(domain: string, isLocked: boolean): Promise<boolean> {
    return this.baseAdapter.setLock(domain, isLocked);
  }

  public setAutomationEnabled(enabled: boolean): void {
    this.apiAutomationEnabled = enabled;
  }
}

export const kenyaRegistryAdapter = new KenyaRegistryAdapter();
