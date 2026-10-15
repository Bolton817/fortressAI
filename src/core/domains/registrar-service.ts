import {
  RegistrarAdapter,
  AvailabilityResult,
  RegistrationRequest,
  RegistrationResult,
  RegistrarDomainStatus,
  RenewalResult,
  TransferResult,
} from "./registrar-adapter";
import { mockRegistrarAdapter } from "./mock-registrar-adapter";
import { kenyaRegistryAdapter } from "./kenya-registry-adapter";
import { DomainValidator } from "./domain-validator";

/**
 * Fortress AI — Registrar Service Dispatcher (TDD §22.2, FR-062, FR-063)
 */

export class RegistrarService {
  /**
   * Resolve appropriate registrar adapter based on domain TLD
   */
  public static getAdapterForDomain(domain: string): RegistrarAdapter {
    try {
      const parsed = DomainValidator.parse(domain);
      if (["co.ke", "ke", "or.ke", "ac.ke", "sc.ke", "me.ke"].includes(parsed.tld)) {
        return kenyaRegistryAdapter;
      }
    } catch {}

    return mockRegistrarAdapter;
  }

  /**
   * Search domain availability and return pricing quote
   */
  public static async search(query: string): Promise<AvailabilityResult> {
    const adapter = this.getAdapterForDomain(query);
    return adapter.checkAvailability({ domain: query });
  }

  /**
   * Quote registration for a specific domain and duration
   */
  public static async quote(domain: string, termYears: number = 1): Promise<AvailabilityResult> {
    const adapter = this.getAdapterForDomain(domain);
    return adapter.quoteRegistration(domain, termYears);
  }

  /**
   * Register a domain with idempotency protection
   */
  public static async register(
    request: RegistrationRequest,
    idempotencyKey: string
  ): Promise<RegistrationResult> {
    const adapter = this.getAdapterForDomain(request.domain);
    return adapter.registerDomain(request, idempotencyKey);
  }

  /**
   * Get domain status from the registrar
   */
  public static async getDomain(domain: string): Promise<RegistrarDomainStatus> {
    const adapter = this.getAdapterForDomain(domain);
    return adapter.getDomain(domain);
  }

  /**
   * Renew an existing domain
   */
  public static async renew(
    domain: string,
    termYears: number = 1,
    idempotencyKey: string
  ): Promise<RenewalResult> {
    const adapter = this.getAdapterForDomain(domain);
    return adapter.renewDomain({ domain, termYears }, idempotencyKey);
  }

  /**
   * Request domain transfer out
   */
  public static async transferOut(domain: string, authCode?: string): Promise<TransferResult> {
    const adapter = this.getAdapterForDomain(domain);
    return adapter.transferOut({ domain, authCode });
  }

  /**
   * Fetch EPP authorization code for transfer
   */
  public static async getAuthCode(domain: string): Promise<string> {
    const adapter = this.getAdapterForDomain(domain);
    return adapter.getAuthCode(domain);
  }

  /**
   * Enable or disable transfer lock
   */
  public static async setLock(domain: string, isLocked: boolean): Promise<boolean> {
    const adapter = this.getAdapterForDomain(domain);
    return adapter.setLock(domain, isLocked);
  }
}
