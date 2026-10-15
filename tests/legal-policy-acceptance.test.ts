import { describe, it, expect, beforeEach } from "vitest";
import { legalPolicyRepository } from "@/db/legal-policy-repository";
import { policyService } from "@/core/legal/policy-service";
import { newsletterRepository } from "@/db/newsletter-repository";

describe("Phase 8: Production Hardening — Terms Acceptance & Policy Versioning (TDD §28.1, §36.1, FR-090)", () => {
  const testUserId = "usr_legal_test_001";

  beforeEach(() => {
    legalPolicyRepository.clearAll();
    newsletterRepository.clearAll();
  });

  describe("Versioned Legal Policies", () => {
    it("provides versioned ToS, Privacy, Domain Portability, and AUP documents", () => {
      const tos = legalPolicyRepository.getPolicy("tos");
      const privacy = legalPolicyRepository.getPolicy("privacy");
      const domain = legalPolicyRepository.getPolicy("domain");
      const aup = legalPolicyRepository.getPolicy("aup");

      expect(tos?.version).toBe("1.0.0");
      expect(privacy?.version).toBe("1.0.0");
      expect(domain?.version).toBe("1.0.0");
      expect(aup?.version).toBe("1.0.0");
      expect(domain?.summary).toContain("Zero dark patterns");
    });

    it("records immutable customer acceptance with timestamps and network context", () => {
      const acceptances = policyService.recordConsent(testUserId, ["tos", "privacy", "aup"], {
        ipAddress: "197.237.100.5",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      });

      expect(acceptances).toHaveLength(3);
      expect(acceptances[0].userId).toBe(testUserId);
      expect(acceptances[0].version).toBe("1.0.0");
      expect(acceptances[0].acceptedAt).toBeDefined();
      expect(acceptances[0].ipAddress).toBe("197.237.100.5");

      const compliance = policyService.verifyCompliance(testUserId);
      expect(compliance.compliant).toBe(true);
      expect(compliance.pendingPolicies).toHaveLength(0);
    });

    it("detects unaccepted mandatory policies for non-compliant users", () => {
      // User only accepts tos
      policyService.recordConsent("usr_incomplete", ["tos"]);

      const compliance = policyService.verifyCompliance("usr_incomplete");
      expect(compliance.compliant).toBe(false);
      expect(compliance.pendingPolicies).toContain("privacy");
      expect(compliance.pendingPolicies).toContain("aup");
    });
  });

  describe("Unbundled Consent & Plain Disclosures (TDD §25.1, §28.1)", () => {
    it("ensures revoking marketing newsletter consent leaves core platform service fully active", () => {
      // User accepts core terms
      policyService.recordConsent(testUserId, ["tos", "privacy", "aup"]);
      expect(policyService.verifyCompliance(testUserId).compliant).toBe(true);

      // User registers and then unsubscribes from newsletter
      newsletterRepository.recordConsent({
        email: "safari@marahorizon.co.ke",
        status: "unsubscribed",
        optInSource: "registration_checkbox",
      });

      // Core legal compliance remains 100% intact
      expect(policyService.verifyCompliance(testUserId).compliant).toBe(true);
    });

    it("generates plain-language renewal disclosures for checkout and domain registration", () => {
      const checkoutDisclosure = policyService.getCheckoutDisclosure(
        "Starter",
        "monthly",
        1900,
        "USD"
      );
      expect(checkoutDisclosure).toContain("automatically renew each monthly");
      expect(checkoutDisclosure).toContain("USD 19.00");
      expect(checkoutDisclosure).toContain("cancel at any time");
      expect(checkoutDisclosure).toContain("Static export is included");

      const domainDisclosure = policyService.getDomainDisclosure(
        "safari-tours.ke",
        1,
        1499,
        1499
      );
      expect(domainDisclosure).toContain("legal registrant for safari-tours.ke");
      expect(domainDisclosure).toContain("$14.99");
      expect(domainDisclosure).toContain("EPP transfer auth codes are available on-demand");
    });
  });
});
