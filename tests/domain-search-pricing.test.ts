import { describe, it, expect, beforeEach } from "vitest";
import { DomainValidator } from "@/core/domains/domain-validator";
import { PricingCatalog } from "@/core/domains/pricing-catalog";
import { mockRegistrarAdapter } from "@/core/domains/mock-registrar-adapter";
import { KenyaRegistryAdapter } from "@/core/domains/kenya-registry-adapter";
import { RegistrarService } from "@/core/domains/registrar-service";

describe("Phase 5: Domain Search & Pricing Engine (TDD §22, FR-062, Risk R-03)", () => {
  beforeEach(() => {
    mockRegistrarAdapter.reset();
  });

  describe("Domain Syntax & Compound TLD Parsing (RFC 1035)", () => {
    it("validates RFC 1035 domain syntax and rejects invalid characters or hyphens", () => {
      expect(DomainValidator.validate("valid-safaris.co.ke").isValid).toBe(true);
      expect(DomainValidator.validate("acme.com").isValid).toBe(true);
      expect(DomainValidator.validate("sub.my-domain.org").isValid).toBe(true);

      // Invalid syntax
      expect(DomainValidator.validate("-invalid.com").isValid).toBe(false);
      expect(DomainValidator.validate("invalid-.com").isValid).toBe(false);
      expect(DomainValidator.validate("invalid..com").isValid).toBe(false);
      expect(DomainValidator.validate("no_underscores.com").isValid).toBe(false);
      expect(DomainValidator.validate("no spaces.com").isValid).toBe(false);
      expect(DomainValidator.validate("").isValid).toBe(false);
      expect(DomainValidator.validate("singleword").isValid).toBe(false);
    });

    it("rejects platform reserved hostnames", () => {
      expect(DomainValidator.validate("localhost").isValid).toBe(false);
      expect(DomainValidator.validate("admin").isValid).toBe(false);
      expect(DomainValidator.validate("api").isValid).toBe(false);
      expect(DomainValidator.validate("dashboard").isValid).toBe(false);
    });

    it("accurately parses compound Kenyan TLDs (.co.ke, .or.ke)", () => {
      const parsedApex = DomainValidator.parse("mara-horizon.co.ke");
      expect(parsedApex.domain).toBe("mara-horizon.co.ke");
      expect(parsedApex.sld).toBe("mara-horizon");
      expect(parsedApex.tld).toBe("co.ke");
      expect(parsedApex.isApex).toBe(true);
      expect(parsedApex.subdomain).toBeUndefined();

      const parsedSub = DomainValidator.parse("booking.mara-horizon.co.ke");
      expect(parsedSub.domain).toBe("booking.mara-horizon.co.ke");
      expect(parsedSub.sld).toBe("mara-horizon");
      expect(parsedSub.tld).toBe("co.ke");
      expect(parsedSub.isApex).toBe(false);
      expect(parsedSub.subdomain).toBe("booking");
    });
  });

  describe("Pricing Catalog & Pricing Book Disclosures (TDD §22.3)", () => {
    it("discloses transparent first-term and renewal pricing across major TLDs", () => {
      const comPricing = PricingCatalog.getPricing("com");
      expect(comPricing).toBeDefined();
      expect(comPricing?.firstTermPriceCents).toBe(1499);
      expect(comPricing?.renewalPriceCents).toBe(1499);
      expect(comPricing?.currency).toBe("USD");

      const ckePricing = PricingCatalog.getPricing("co.ke");
      expect(ckePricing).toBeDefined();
      expect(ckePricing?.firstTermPriceCents).toBe(1299);
      expect(ckePricing?.renewalPriceCents).toBe(1299);
      expect(ckePricing?.requiresContactVerification).toBe(true);

      const ioPricing = PricingCatalog.getPricing("io");
      expect(ioPricing?.firstTermPriceCents).toBe(3999);
    });

    it("returns null for unsupported TLDs", () => {
      expect(PricingCatalog.isSupported("unsupportedxyz99")).toBe(false);
      expect(PricingCatalog.getPricing("unsupportedxyz99")).toBeNull();
    });
  });

  describe("Registrar Availability Search & KeNIC Adapter (FR-062, Risk R-03)", () => {
    it("queries availability for available and registered domains", async () => {
      const available = await RegistrarService.search("available-luxury-camps.com");
      expect(available.isAvailable).toBe(true);
      expect(available.supported).toBe(true);
      expect(available.firstTermPriceCents).toBe(1499);

      const taken = await RegistrarService.search("google.com");
      expect(taken.isAvailable).toBe(false);
      expect(taken.reason).toContain("already registered");

      const unsupported = await RegistrarService.search("test.unsupportedtld99");
      expect(unsupported.supported).toBe(false);
      expect(unsupported.isAvailable).toBe(false);
    });

    it("validates Kenyan phone numbers and registrant eligibility for .co.ke (KeNIC rules)", () => {
      const kenyaAdapter = new KenyaRegistryAdapter();

      // Valid phone numbers
      expect(KenyaRegistryAdapter.normalizeKenyanPhone("0712345678").isValid).toBe(true);
      expect(KenyaRegistryAdapter.normalizeKenyanPhone("0712345678").normalized).toBe("+254712345678");
      expect(KenyaRegistryAdapter.normalizeKenyanPhone("+254712345678").isValid).toBe(true);
      expect(KenyaRegistryAdapter.normalizeKenyanPhone("254712345678").normalized).toBe("+254712345678");

      // Invalid phone
      expect(KenyaRegistryAdapter.normalizeKenyanPhone("1234").isValid).toBe(false);

      // Contact validation
      const validContact = {
        firstName: "Jomo",
        lastName: "Kenyatta",
        email: "jomo@safaris.co.ke",
        phone: "0712345678",
        addressLine1: "Harambee Ave",
        city: "Nairobi",
        postalCode: "00100",
        countryCode: "KE",
      };
      expect(kenyaAdapter.validateKenyanRegistrant(validContact, "co.ke").isValid).toBe(true);

      // Restricted .go.ke rejection
      expect(kenyaAdapter.validateKenyanRegistrant(validContact, "go.ke").isValid).toBe(false);
    });

    it("handles Risk R-03: reports assisted manual registration when API automation is restricted", async () => {
      const restrictedKenyaAdapter = new KenyaRegistryAdapter(mockRegistrarAdapter, false);

      const search = await restrictedKenyaAdapter.checkAvailability({ domain: "safaris-adventure.co.ke" });
      expect(search.supported).toBe(true);
      expect(search.requiresAssistedRegistration).toBe(true);
      expect(search.policyNotes).toContain("Risk R-03");

      const regResult = await restrictedKenyaAdapter.registerDomain(
        {
          domain: "safaris-adventure.co.ke",
          termYears: 1,
          registrant: {
            firstName: "Daniel",
            lastName: "Arap",
            email: "daniel@safaris.co.ke",
            phone: "+254722000000",
            addressLine1: "Moi Avenue",
            city: "Nairobi",
            postalCode: "00100",
            countryCode: "KE",
          },
        },
        "idemp_kenic_test_01"
      );

      expect(regResult.success).toBe(true);
      expect(regResult.isAssistedRegistration).toBe(true);
      expect(regResult.rawResponse?.kenicWorkflow).toBe("assisted_provisioning_queue");
    });
  });
});
