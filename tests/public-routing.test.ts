import { describe, it, expect, beforeEach } from "vitest";
import { domainRepository } from "@/db/domain-repository";
import { tenantRepository } from "@/db/tenant-repository";
import { releaseRepository } from "@/db/release-repository";
import { PublishOrchestrator } from "@/core/publish/publish-orchestrator";
import {
  seedPhase0Tenants,
  USER_A_ID,
  SITE_A_ID,
  SITE_B_ID,
  maraHorizonConfig,
} from "@/db/seed-data";

describe("Phase 4: Public Routing & Draft Isolation (TDD §7.1, §20; FR-034, FR-060)", () => {
  const userId = USER_A_ID;
  const siteId = SITE_A_ID;

  beforeEach(() => {
    tenantRepository.clearAll();
    releaseRepository.clearAll();
    domainRepository.clearAll();
    seedPhase0Tenants();
  });

  describe("Draft Isolation Invariant (TDD §7.1, FR-034)", () => {
    it("never serves draft content on public routes while draft edits are in progress", async () => {
      // 1. Publish Release 1
      const initialPublish = await PublishOrchestrator.publishSite(
        siteId,
        userId,
        "V1 Public"
      );

      const activeRelease1 = releaseRepository.getRelease(initialPublish.release.id)!;
      const initialHero = activeRelease1.config.pages[0].sections.find(
        (s: any) => s.sectionId?.startsWith("hero") || s.content?.headline
      )!;
      const initialHeroHeadline = initialHero.content.headline;

      // 2. Modify draft revision in workspace
      const mutatedConfig = JSON.parse(JSON.stringify(maraHorizonConfig));
      const draftHeroToMutate = mutatedConfig.pages[0].sections.find(
        (s: any) => s.sectionId?.startsWith("hero") || s.content?.headline
      )!;
      draftHeroToMutate.content.headline = "WIP DRAFT: Secret Unreleased Headline";

      await tenantRepository.saveRevision(
        { userId },
        siteId,
        mutatedConfig,
        "Work-in-progress draft edit"
      );

      // Verify draft configuration reflects new WIP headline
      const draftConfig = await tenantRepository.getDraftConfiguration(
        { userId },
        siteId
      );
      const draftHero = draftConfig.pages[0].sections.find(
        (s: any) => s.sectionId?.startsWith("hero") || s.content?.headline
      )!;
      expect(draftHero.content.headline).toBe("WIP DRAFT: Secret Unreleased Headline");

      // 3. Verify active published release STILL serves original Release 1 headline
      const site = tenantRepository.getSiteDirect(siteId)!;
      const activePublicRelease = releaseRepository.getRelease(site.publishedReleaseId!)!;
      const publicHero = activePublicRelease.config.pages[0].sections.find(
        (s: any) => s.sectionId?.startsWith("hero") || s.content?.headline
      )!;

      expect(publicHero.content.headline).toBe(initialHeroHeadline);
      expect(publicHero.content.headline).not.toContain("Secret Unreleased Headline");
    });

    it("identifies unpublished site without active release pointer", () => {
      const site = tenantRepository.getSiteDirect(siteId)!;
      expect(site.publishedReleaseId).toBeUndefined();
      expect(site.lifecycleStatus).toBe("draft");
    });
  });

  describe("Multi-Tenant Hostname & Subdomain Resolution (TDD §7.1, FR-060)", () => {
    it("resolves platform subdomain to canonical site", () => {
      const site = tenantRepository.getSiteDirect(siteId)!;
      const resolved = domainRepository.resolveSiteIdFromHostname(
        `${site.platformSlug}.fortressai.app`
      );

      expect(resolved).toBeDefined();
      expect(resolved?.siteId).toBe(site.id);
      expect(resolved?.slug).toBe(site.platformSlug);
    });

    it("resolves localhost subdomain in development mode", () => {
      const site = tenantRepository.getSiteDirect(siteId)!;
      const resolved = domainRepository.resolveSiteIdFromHostname(
        `${site.platformSlug}.localhost:3000`
      );

      expect(resolved).toBeDefined();
      expect(resolved?.siteId).toBe(site.id);
    });

    it("registers and resolves verified custom domain mapping", () => {
      const customDomain = "safaris.kenya-tours.com";
      domainRepository.createDomain(siteId, customDomain, "custom_apex", false);

      // Before verification, resolution is blocked
      let resolved = domainRepository.resolveSiteIdFromHostname(customDomain);
      expect(resolved).toBeNull();

      // Verify domain ownership
      domainRepository.verifyDomain(customDomain);

      // After verification, custom domain resolves
      resolved = domainRepository.resolveSiteIdFromHostname(customDomain);
      expect(resolved).toBeDefined();
      expect(resolved?.siteId).toBe(siteId);
    });

    it("never guesses tenant for unknown hostnames (TDD §7.1 #13)", () => {
      const unknownHostname = "completely-unknown-domain-xyz.com";
      const resolved = domainRepository.resolveSiteIdFromHostname(unknownHostname);
      expect(resolved).toBeNull();
    });

    it("rejects duplicate hostname registration across different sites", () => {
      const sharedHostname = "wildlife-safaris.co.ke";
      domainRepository.createDomain(siteId, sharedHostname, "custom_apex");

      const otherSiteId = SITE_B_ID;
      expect(() =>
        domainRepository.createDomain(otherSiteId, sharedHostname, "custom_apex")
      ).toThrow("already assigned");
    });
  });
});
