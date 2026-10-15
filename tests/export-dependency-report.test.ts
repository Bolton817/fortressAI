import { describe, it, expect, beforeEach } from "vitest";
import { scanExportDependencies } from "@/core/export/dependency-scanner";
import { bundleSiteAssets } from "@/core/export/asset-bundler";
import { ExportManifestSchema } from "@/core/export/types";
import { tenantRepository } from "@/db/tenant-repository";
import { seedPhase0Tenants, USER_A_ID, SITE_A_ID } from "@/db/seed-data";

describe("Phase 7: Export Dependency Report & Manifest Specification (TDD §21.2, §40.6, FR-081)", () => {
  beforeEach(async () => {
    seedPhase0Tenants();
  });

  it("produces a manifest.json strictly conforming to the TDD §40.6 schema", async () => {
    const config = await tenantRepository.getDraftConfiguration({ userId: USER_A_ID }, SITE_A_ID);
    const routes = config.pages.map((p) => p.slug);
    const { assetManifest } = bundleSiteAssets(config);

    const { manifest, manifestJsonContent } = scanExportDependencies(config, routes, assetManifest);

    // Validate using Zod schema
    const parsed = ExportManifestSchema.parse(manifest);
    expect(parsed.siteId).toBe(config.siteId);
    expect(parsed.exportCompilerVersion).toBe("1.0.0");
    expect(parsed.routes).toEqual(routes);
    expect(parsed.checks.routes).toBe("passed");
    expect(parsed.checks.secretScan).toBe("passed");

    // Check JSON serialization
    const jsonParsed = JSON.parse(manifestJsonContent);
    expect(jsonParsed.siteId).toBe(config.siteId);
    expect(Array.isArray(jsonParsed.dependencies)).toBe(true);
  });

  it("identifies backend-dependent contact forms and provides actionable external alternatives", async () => {
    const config = await tenantRepository.getDraftConfiguration({ userId: USER_A_ID }, SITE_A_ID);
    const routes = config.pages.map((p) => p.slug);
    const { assetManifest } = bundleSiteAssets(config);

    const { dependencyReport, reportMarkdownContent } = scanExportDependencies(config, routes, assetManifest);

    // Features check
    const contactFormDep = dependencyReport.features.find((f) => f.feature === "contact-form");
    expect(contactFormDep).toBeDefined();
    expect(contactFormDep!.status).toBe("external-required");
    expect(contactFormDep!.action).toContain("Formspree");

    const analyticsDep = dependencyReport.features.find((f) => f.feature === "platform-analytics");
    expect(analyticsDep).toBeDefined();
    expect(analyticsDep!.status).toBe("not-included");

    const themeDep = dependencyReport.features.find((f) => f.feature === "theme-rendering");
    expect(themeDep).toBeDefined();
    expect(themeDep!.status).toBe("supported");

    // Markdown report check
    expect(reportMarkdownContent).toContain("# Fortress AI — Export Dependency & Compatibility Report");
    expect(reportMarkdownContent).toContain("## 2. Feature & Dependency Matrix");
    expect(reportMarkdownContent).toContain("contact-form");
    expect(reportMarkdownContent).toContain("external-required");
  });

  it("dynamically flags lead capture API when hero.lead-form section is present", async () => {
    const config = await tenantRepository.getDraftConfiguration({ userId: USER_A_ID }, SITE_A_ID);

    // Inject a lead-form hero into the homepage
    const updatedConfig = {
      ...config,
      pages: config.pages.map((p) => {
        if (p.slug === "/") {
          return {
            ...p,
            sections: [
              ...p.sections,
              {
                instanceId: "inst_test_lead_form",
                sectionId: "hero.lead-form",
                sectionVersion: "1.0.0",
                content: {
                  headline: "Get a Free Consultation",
                  subheadline: "Reach out to our partners today.",
                  ctaButtonText: "Request Call",
                },
              },
            ],
          };
        }
        return p;
      }),
    };

    const routes = updatedConfig.pages.map((p) => p.slug);
    const { dependencyReport } = scanExportDependencies(updatedConfig, routes, []);

    const leadCaptureDep = dependencyReport.features.find((f) => f.feature === "lead-capture-api");
    expect(leadCaptureDep).toBeDefined();
    expect(leadCaptureDep!.status).toBe("external-required");
  });
});
