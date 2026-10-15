import * as dns from "node:dns/promises";
import { domainRepository } from "@/db/domain-repository";
import { DomainValidator } from "./domain-validator";

/**
 * Fortress AI — DNS Ownership Verifier (TDD §22.4, §22.5, FR-061)
 */

export interface DnsVerificationResult {
  success: boolean;
  hostname: string;
  status: "verified" | "pending" | "failed";
  reason?: string;
  lastCheckedAt: string;
  recordsFound?: string[];
}

export class DnsVerifier {
  // In-memory test DNS records for automated tests and CI environments
  private static testDnsTxtRecords: Map<string, string[]> = new Map();
  private static testDnsCnameRecords: Map<string, string> = new Map();

  /**
   * Set simulated DNS TXT records (useful for automated testing)
   */
  public static setMockTxtRecord(host: string, values: string[]): void {
    this.testDnsTxtRecords.set(host.toLowerCase().trim(), values);
  }

  /**
   * Set simulated DNS CNAME record (useful for automated testing)
   */
  public static setMockCnameRecord(host: string, target: string): void {
    this.testDnsCnameRecords.set(host.toLowerCase().trim(), target.toLowerCase().trim());
  }

  /**
   * Clear simulated DNS records
   */
  public static clearMockDns(): void {
    this.testDnsTxtRecords.clear();
    this.testDnsCnameRecords.clear();
  }

  /**
   * Verify DNS ownership for a given hostname
   */
  public static async verify(hostname: string): Promise<DnsVerificationResult> {
    const cleanHost = DomainValidator.normalize(hostname);
    const mapping = domainRepository.getDomain(cleanHost);

    const now = new Date().toISOString();

    if (!mapping) {
      return {
        success: false,
        hostname: cleanHost,
        status: "failed",
        reason: `Domain mapping for "${cleanHost}" not found.`,
        lastCheckedAt: now,
      };
    }

    // Platform subdomains are always verified by default
    if (mapping.domainType === "platform_subdomain") {
      domainRepository.verifyDomain(cleanHost);
      return {
        success: true,
        hostname: cleanHost,
        status: "verified",
        lastCheckedAt: now,
      };
    }

    // Challenge expiry check
    if (mapping.challengeExpiresAt && new Date(mapping.challengeExpiresAt).getTime() < Date.now()) {
      domainRepository.updateDnsStatus(cleanHost, "failed", now);
      return {
        success: false,
        hostname: cleanHost,
        status: "failed",
        reason: "DNS verification challenge has expired. Please regenerate your verification token.",
        lastCheckedAt: now,
      };
    }

    const expectedHost = mapping.challengeHost || `_fortress-challenge.${cleanHost}`;
    const expectedValue = mapping.challengeValue || `fortress-verification=${mapping.verificationToken}`;

    let recordsFound: string[] = [];

    // 1. Check test mock table first
    if (this.testDnsTxtRecords.has(expectedHost.toLowerCase())) {
      recordsFound = this.testDnsTxtRecords.get(expectedHost.toLowerCase()) || [];
    } else {
      // 2. Query live DNS
      try {
        const resolved = await dns.resolveTxt(expectedHost);
        // resolveTxt returns string[][]
        recordsFound = resolved.map((chunks) => chunks.join(""));
      } catch {
        // DNS lookup failed or NXDOMAIN
        recordsFound = [];
      }
    }

    const tokenMatched = recordsFound.some((val) =>
      val.includes(mapping.verificationToken) || val.trim() === expectedValue.trim()
    );

    if (tokenMatched) {
      domainRepository.updateDnsStatus(cleanHost, "verified", now);
      return {
        success: true,
        hostname: cleanHost,
        status: "verified",
        lastCheckedAt: now,
        recordsFound,
      };
    }

    domainRepository.updateDnsStatus(cleanHost, "pending", now);
    return {
      success: false,
      hostname: cleanHost,
      status: "pending",
      reason: `Verification TXT record not found at "${expectedHost}". Expected value: "${expectedValue}".`,
      lastCheckedAt: now,
      recordsFound,
    };
  }
}
