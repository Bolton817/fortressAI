import {
  legalPolicyRepository,
  PolicyIdentifier,
  StoredPolicyAcceptance,
} from "@/db/legal-policy-repository";

/**
 * Fortress AI — Legal Policy & Plain Disclosure Service (TDD §28.1, §36.1, FR-090)
 * Enforces unbundled consent, auditable policy tracking, and plain renewal disclosures.
 */

export class PolicyService {
  /**
   * Record customer acceptance of specified policies
   */
  public recordConsent(
    userId: string,
    policyIds: PolicyIdentifier[],
    metadata: { ipAddress?: string | null; userAgent?: string | null } = {}
  ): StoredPolicyAcceptance[] {
    const results: StoredPolicyAcceptance[] = [];
    for (const pId of policyIds) {
      const policy = legalPolicyRepository.getPolicy(pId);
      if (!policy) continue;
      const acc = legalPolicyRepository.recordAcceptance({
        userId,
        policyId: pId,
        version: policy.version,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });
      results.push(acc);
    }
    return results;
  }

  /**
   * Check whether a user has accepted all mandatory core policies (ToS and Privacy)
   */
  public verifyCompliance(userId: string): {
    compliant: boolean;
    pendingPolicies: PolicyIdentifier[];
  } {
    const mandatory: PolicyIdentifier[] = ["tos", "privacy", "aup"];
    const pending: PolicyIdentifier[] = [];

    for (const pId of mandatory) {
      if (!legalPolicyRepository.hasAcceptedCurrentVersion(userId, pId)) {
        pending.push(pId);
      }
    }

    return {
      compliant: pending.length === 0,
      pendingPolicies: pending,
    };
  }

  /**
   * Plain-language subscription renewal disclosure (TDD §24.1, FR-090)
   */
  public getCheckoutDisclosure(
    planName: string,
    billingInterval: "monthly" | "annual",
    amountMinorUnits: number,
    currency: string
  ): string {
    const formatted = `${currency} ${(amountMinorUnits / 100).toFixed(2)}`;
    return `By confirming your subscription to the ${planName} plan at ${formatted} per ${billingInterval}, you agree to Fortress AI Terms of Service v1.0.0 and Privacy Policy v1.0.0. Your subscription will automatically renew each ${billingInterval} until cancelled. You may cancel at any time in your dashboard before the renewal date. Static export is included and portable.`;
  }

  /**
   * Plain-language domain registration disclosure (TDD §22.1, FR-063, FR-090)
   */
  public getDomainDisclosure(
    domainName: string,
    termYears: number,
    priceCents: number,
    renewalPriceCents: number
  ): string {
    const initialFormatted = `$${(priceCents / 100).toFixed(2)}`;
    const renewalFormatted = `$${(renewalPriceCents / 100).toFixed(2)}`;
    return `You will be designated as the legal registrant for ${domainName} for ${termYears} year(s) at ${initialFormatted}. Annual renewal will be billed at ${renewalFormatted}/year unless auto-renewal is disabled. EPP transfer auth codes are available on-demand with zero retention locks.`;
  }
}

export const policyService = new PolicyService();
