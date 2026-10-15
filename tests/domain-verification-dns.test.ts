import { describe, it, expect, beforeEach } from "vitest";
import { ChallengeGenerator } from "@/core/domains/challenge-generator";
import { DnsVerifier } from "@/core/domains/dns-verifier";
import { TlsChecker } from "@/core/domains/tls-checker";
import { DomainOrchestrator } from "@/core/domains/domain-orchestrator";
import { domainRepository } from "@/db/domain-repository";
import { seedPhase0Tenants, USER_A_ID, SITE_A_ID, USER_B_ID, SITE_B_ID } from "@/db/seed-data";

describe("Phase 5: DNS Ownership Verification & TLS Readiness (TDD §22.4, §22.5, FR-061, FR-064)", () => {
  const siteId = SITE_A_ID; // Mara Horizon Expeditions
  const ownerUserId = USER_A_ID;
  const otherUserId = USER_B_ID;
  const otherSiteId = SITE_B_ID;

  beforeEach(() => {
    seedPhase0Tenants();
    domainRepository.clearAll();
    DnsVerifier.clearMockDns();
    TlsChecker.clearMockTls();
  });

  describe("Cryptographic Challenge Generation (FR-061)", () => {
    it("generates a 32-byte cryptographic token and formatted DNS records", () => {
      const challenge = ChallengeGenerator.generate("acme-safaris.co.ke", "custom_apex");

      expect(challenge.token).toHaveLength(64); // 32 bytes in hex = 64 characters
      expect(challenge.challengeHost).toBe("_fortress-challenge.acme-safaris.co.ke");
      expect(challenge.challengeValue).toBe(`fortress-verification=${challenge.token}`);
      expect(challenge.type).toBe("txt");

      // Verify Apex instructions include A and CNAME www
      const txtRecord = challenge.instructions.find((r) => r.type === "TXT");
      const aRecord = challenge.instructions.find((r) => r.type === "A");
      const cnameRecord = challenge.instructions.find((r) => r.type === "CNAME");

      expect(txtRecord).toBeDefined();
      expect(aRecord?.name).toBe("@");
      expect(cnameRecord?.name).toBe("www");
    });

    it("generates CNAME routing instruction for subdomains", () => {
      const challenge = ChallengeGenerator.generate("tours.acme-safaris.co.ke", "custom_subdomain");
      expect(challenge.challengeHost).toBe("_fortress-challenge.tours.acme-safaris.co.ke");

      const cnameRecord = challenge.instructions.find((r) => r.type === "CNAME");
      expect(cnameRecord?.name).toBe("tours");
      expect(cnameRecord?.value).toBe("proxy.fortress.local");
    });
  });

  describe("DNS Ownership Verification Engine (FR-061)", () => {
    it("successfully verifies domain when DNS TXT record matches token", async () => {
      const mapping = DomainOrchestrator.attachCustomDomain({
        siteId,
        userId: ownerUserId,
        rawHostname: "verified-safaris.co.ke",
      });

      expect(mapping.verificationStatus).toBe("pending");

      // Inject expected DNS TXT record in mock DNS resolver
      DnsVerifier.setMockTxtRecord(
        `_fortress-challenge.verified-safaris.co.ke`,
        [`fortress-verification=${mapping.verificationToken}`]
      );

      const verification = await DnsVerifier.verify("verified-safaris.co.ke");
      expect(verification.success).toBe(true);
      expect(verification.status).toBe("verified");

      // Check repository persistence
      const updated = domainRepository.getDomain("verified-safaris.co.ke");
      expect(updated?.verificationStatus).toBe("verified");
    });

    it("leaves status as pending when DNS record is missing or mismatched", async () => {
      DomainOrchestrator.attachCustomDomain({
        siteId,
        userId: ownerUserId,
        rawHostname: "unpropagated-safaris.co.ke",
      });

      // No mock record injected (simulating unpropagated DNS)
      const verification = await DnsVerifier.verify("unpropagated-safaris.co.ke");
      expect(verification.success).toBe(false);
      expect(verification.status).toBe("pending");
      expect(verification.reason).toContain("Verification TXT record not found");
    });

    it("fails verification if challenge has expired (72 hour window)", async () => {
      const mapping = DomainOrchestrator.attachCustomDomain({
        siteId,
        userId: ownerUserId,
        rawHostname: "expired-challenge.co.ke",
      });

      // Simulate expired challenge (set expiration 1 hour in the past)
      domainRepository.setChallenge("expired-challenge.co.ke", {
        type: "txt",
        host: mapping.challengeHost || "_fortress-challenge.expired-challenge.co.ke",
        value: mapping.challengeValue || `fortress-verification=${mapping.verificationToken}`,
        expiresAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      });

      const verification = await DnsVerifier.verify("expired-challenge.co.ke");
      expect(verification.success).toBe(false);
      expect(verification.status).toBe("failed");
      expect(verification.reason).toContain("expired");
    });
  });

  describe("TLS Readiness & Anti-Takeover Security Boundary (TDD §22.4, §22.5, FR-064)", () => {
    it("enforces invariant: SSL certificate is pending until DNS verification passes", async () => {
      DomainOrchestrator.attachCustomDomain({
        siteId,
        userId: ownerUserId,
        rawHostname: "ssl-pending.co.ke",
      });

      // Attempt TLS check while DNS is still pending
      const tlsResult = await TlsChecker.check("ssl-pending.co.ke");
      expect(tlsResult.success).toBe(false);
      expect(tlsResult.status).toBe("pending");
      expect(tlsResult.reason).toContain("DNS verification must pass");
    });

    it("provisions TLS certificate once DNS verification passes", async () => {
      DomainOrchestrator.attachCustomDomain({
        siteId,
        userId: ownerUserId,
        rawHostname: "ssl-ready.co.ke",
      });

      // Verify DNS
      domainRepository.updateDnsStatus("ssl-ready.co.ke", "verified");

      // Check TLS
      const tlsResult = await TlsChecker.check("ssl-ready.co.ke");
      expect(tlsResult.success).toBe(true);
      expect(tlsResult.status).toBe("active");
      expect(tlsResult.issuer).toBeDefined();
    });

    it("strictly prevents domain takeover: Site B cannot attach a domain claimed by Site A", () => {
      // Tenant A attaches domain
      DomainOrchestrator.attachCustomDomain({
        siteId,
        userId: ownerUserId,
        rawHostname: "claimed-safaris.co.ke",
      });

      // Tenant B attempts to attach the same domain
      expect(() => {
        DomainOrchestrator.attachCustomDomain({
          siteId: otherSiteId,
          userId: otherUserId,
          rawHostname: "claimed-safaris.co.ke",
        });
      }).toThrow(/already claimed or mapped/);
    });
  });
});
