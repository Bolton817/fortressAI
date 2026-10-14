import { describe, it, expect, beforeEach } from "vitest";
import {
  USER_A_ID,
  SITE_A_ID,
  USER_B_ID,
  SITE_B_ID,
  maraHorizonConfig,
  seedPhase0Tenants,
} from "@/db/seed-data";
import { tenantRepository } from "@/db/tenant-repository";
import { TenantAccessDeniedError } from "@/core/errors";
import { SiteConfigurationSchema } from "@/core/schema/site-config";
import { sectionRegistry } from "@/registry";
import { compileSiteToStatic } from "@/exporter/static-compiler";

describe("Phase 0 — Architecture Proof Acceptance Tests (TDD §36)", () => {
  beforeEach(() => {
    seedPhase0Tenants();
  });

  describe("TEST-P0-01: Tenant Isolation & Data Boundary (TDD §7, FR-009)", () => {
    it("allows Tenant A to read their own site and draft configuration", async () => {
      const site = await tenantRepository.getSite({ userId: USER_A_ID }, SITE_A_ID);
      expect(site.id).toBe(SITE_A_ID);
      expect(site.ownerUserId).toBe(USER_A_ID);

      const config = await tenantRepository.getDraftConfiguration({ userId: USER_A_ID }, SITE_A_ID);
      expect(config.businessProfile.name).toBe("Mara Horizon Expeditions");
      expect(config.theme.themeId).toBe("warm-editorial");
    });

    it("prevents Tenant A from reading Tenant B's site configuration", async () => {
      await expect(
        tenantRepository.getSite({ userId: USER_A_ID }, SITE_B_ID)
      ).rejects.toThrow(TenantAccessDeniedError);

      await expect(
        tenantRepository.getDraftConfiguration({ userId: USER_A_ID }, SITE_B_ID)
      ).rejects.toThrow(TenantAccessDeniedError);
    });

    it("prevents Tenant B from mutating Tenant A's revisions", async () => {
      await expect(
        tenantRepository.saveRevision(
          { userId: USER_B_ID },
          SITE_A_ID,
          maraHorizonConfig,
          "Malicious edit attempt"
        )
      ).rejects.toThrow(TenantAccessDeniedError);
    });

    it("increments version number and preserves immutable history on legitimate revision save", async () => {
      const updatedConfig = {
        ...maraHorizonConfig,
        businessProfile: {
          ...maraHorizonConfig.businessProfile,
          summary: "Updated conservation-first wildlife experiences.",
        },
      };

      const newRev = await tenantRepository.saveRevision(
        { userId: USER_A_ID },
        SITE_A_ID,
        updatedConfig,
        "Refreshed summary copy"
      );

      expect(newRev.version).toBe(2);
      expect(newRev.config.businessProfile.summary).toBe("Updated conservation-first wildlife experiences.");

      // Check that version 1 remains accessible and untouched (TDD §8.4)
      const v1 = await tenantRepository.getRevisionByVersion({ userId: USER_A_ID }, SITE_A_ID, 1);
      expect(v1.version).toBe(1);
      expect(v1.config.businessProfile.summary).toContain("Bespoke, conservation-focused");
    });
  });

  describe("TEST-P0-02: Canonical Schema Invariants & Validation (TDD §8.1, §40)", () => {
    it("validates valid site configuration successfully", () => {
      const parsed = SiteConfigurationSchema.safeParse(maraHorizonConfig);
      expect(parsed.success).toBe(true);
    });

    it("rejects configuration with missing required fields", () => {
      const invalid = {
        ...maraHorizonConfig,
        businessProfile: {
          // name missing
          industry: "Tourism",
        },
      };
      const parsed = SiteConfigurationSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it("rejects configuration with invalid route slug format", () => {
      const invalid = {
        ...maraHorizonConfig,
        pages: [
          {
            ...maraHorizonConfig.pages[0],
            slug: "invalid-without-leading-slash",
          },
        ],
      };
      const parsed = SiteConfigurationSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe("TEST-P0-03 & P0-04: Section Registry & Manifest Contract (TDD §9, ADR-004)", () => {
    it("has all 5 starter manifests registered and available", () => {
      const requiredSections = [
        "shell.header",
        "hero.split",
        "services.card-grid",
        "about.story",
        "shell.footer",
      ];

      for (const secId of requiredSections) {
        expect(sectionRegistry.has(secId)).toBe(true);
        const entry = sectionRegistry.getEntry(secId);
        expect(entry.manifest.id).toBe(secId);
        expect(entry.manifest.status).toBe("released");
        expect(entry.component).toBeDefined();
      }
    });
  });

  describe("TEST-P0-05: Static Export Pipeline (TDD §21, §40.6, FR-080, FR-081)", () => {
    it("compiles canonical configuration into a complete portable static bundle", () => {
      const exportResult = compileSiteToStatic(maraHorizonConfig);

      expect(exportResult.siteId).toBe(SITE_A_ID);
      expect(exportResult.manifest.exportCompilerVersion).toBe("1.0.0");
      expect(exportResult.manifest.routes).toContain("/");

      const filePaths = exportResult.files.map((f) => f.path);
      expect(filePaths).toContain("index.html");
      expect(filePaths).toContain("sitemap.xml");
      expect(filePaths).toContain("robots.txt");
      expect(filePaths).toContain("dependencies.json");
      expect(filePaths).toContain("README.md");

      // Verify index.html content
      const indexHtml = exportResult.files.find((f) => f.path === "index.html")!.content;
      expect(indexHtml).toContain("<!DOCTYPE html>");
      expect(indexHtml).toContain("Mara Horizon Expeditions");
      expect(indexHtml).toContain("Encounter Kenya");
      expect(indexHtml).toContain("var(--theme-primary");

      // Verify sitemap.xml
      const sitemap = exportResult.files.find((f) => f.path === "sitemap.xml")!.content;
      expect(sitemap).toContain("<loc>https://mara-horizon.fortress-ai.com</loc>");

      // Verify dependencies.json (FR-081)
      const depReport = exportResult.dependencyReport;
      expect(depReport.checks.routes).toBe("passed");
      expect(depReport.features.some((f) => f.feature === "contact-form")).toBe(true);
    });
  });
});
