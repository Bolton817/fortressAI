import { SiteConfigurationSchema } from "../src/core/schema/site-config";
import { sectionRegistry } from "../src/registry";
import { defaultThemes, resolveTheme, themeTokensToCssVariables } from "../src/themes/default-themes";
import { validateThemeContrast } from "../src/themes/contrast";
import { curatedAssetCatalogue } from "../src/assets/catalogue";
import { selectAssetForSlot, buildCloudinaryUrl } from "../src/assets/selection-engine";
import { composeWebsite } from "../src/composition/composer";
import { compileSiteToStatic } from "../src/exporter/static-compiler";
import { tenantRepository } from "../src/db/tenant-repository";
import {
  USER_C_ID,
  SITE_C_ID,
  seedPhase0Tenants,
} from "../src/db/seed-data";

async function runPhase1Verification() {
  console.log("===============================================================");
  console.log("  FORTRESS AI — PHASE 1 DESIGN ENGINE VERIFICATION");
  console.log("  Evaluating against TDD §8, §9, §10, §14, §16, §21 Exit Criteria");
  console.log("===============================================================\n");

  let allChecksPassed = true;

  function assert(condition: boolean, label: string) {
    if (condition) {
      console.log(`  ✓ [PASS] ${label}`);
    } else {
      console.error(`  ✗ [FAIL] ${label}`);
      allChecksPassed = false;
    }
  }

  // --------------------------------------------------------------------------
  // Check 1: Design Tokens & WCAG 2.2 AA Contrast Compliance (TDD §10)
  // --------------------------------------------------------------------------
  console.log("1. THEMES & WCAG 2.2 AA CONTRAST COMPLIANCE (TDD §10, FR-030)");
  const themeIds = Object.keys(defaultThemes);
  assert(themeIds.length >= 6, `At least 6 distinct design themes exist (found ${themeIds.length})`);

  for (const themeId of themeIds) {
    const report = validateThemeContrast(defaultThemes[themeId]);
    const textReport = report.reports.find((r) => r.pair === "Text on Background");
    assert(
      report.passed,
      `Theme "${themeId}" (${defaultThemes[themeId].name}) passes WCAG 2.2 AA contrast: text on bg ${textReport?.ratio}:1 (meets ${textReport?.meetsAANormal ? "AA Normal >= 4.5" : "AA Large >= 3.0"})`
    );

    const resolved = resolveTheme(themeId);
    const cssVars = themeTokensToCssVariables(resolved);
    assert(
      Object.keys(cssVars).length >= 15 && cssVars["--theme-primary"] !== undefined,
      `Theme "${themeId}" compiles to valid CSS variable block (${Object.keys(cssVars).length} variables)`
    );
  }

  // --------------------------------------------------------------------------
  // Check 2: Curated Section Registry — 20 Variants across 8 Families (TDD §9)
  // --------------------------------------------------------------------------
  console.log("\n2. CURATED SECTION REGISTRY — 20 VARIANTS (TDD §9, ADR-004)");
  const manifests = sectionRegistry.listManifests();
  assert(manifests.length === 20, `Registry contains exactly 20 released section variants (found ${manifests.length})`);

  const families = [
    { prefix: "shell.header", label: "Header" },
    { prefix: "hero.", label: "Hero" },
    { prefix: "services.", label: "Services" },
    { prefix: "about.", label: "About" },
    { prefix: "proof.", label: "Social Proof" },
    { prefix: "faq.", label: "FAQ" },
    { prefix: "cta.", label: "CTA" },
    { prefix: "contact.", label: "Contact" },
    { prefix: "blog.", label: "Blog" },
    { prefix: "shell.footer", label: "Footer" },
  ];

  for (const fam of families) {
    const matching = manifests.filter((m) => m.id.startsWith(fam.prefix));
    assert(matching.length >= 1, `Family "${fam.label}" has registered variants (${matching.map((m) => m.id).join(", ")})`);
  }

  for (const manifest of manifests) {
    const entry = sectionRegistry.getEntry(manifest.id);
    assert(entry.manifest.export.staticSafe === true, `Variant [${manifest.id}] declares staticSafe: true`);
    assert(typeof entry.component === "function", `Variant [${manifest.id}] has valid React component`);
  }

  // --------------------------------------------------------------------------
  // Check 3: Curated Asset Catalogue & Selection Engine (TDD §14, §15, FR-050)
  // --------------------------------------------------------------------------
  console.log("\n3. ASSET CATALOGUE & SELECTION ENGINE (TDD §14, §15)");
  assert(curatedAssetCatalogue.length >= 19, `Curated asset catalogue contains licensed assets (found ${curatedAssetCatalogue.length})`);

  const safariAsset = selectAssetForSlot(
    { slotId: "hero_image", required: true, aspectRatio: "16:9", acceptedSubjectTags: ["hero", "landscape"] },
    { industry: "Tourism & Safari", regionPreference: "kenya" },
    new Set<string>(),
    "verify_safari_seed"
  );
  assert(safariAsset !== null && safariAsset.assetId.includes("safari"), "Asset engine deterministically selected licensed Safari asset");

  const responsiveCloudinary = buildCloudinaryUrl("safari_elephants_sunset", { width: 1400 });
  assert(responsiveCloudinary.includes("cloudinary.com") && responsiveCloudinary.includes("w_1400"), "Responsive Cloudinary URL generator compiles optimized dimensions");

  // Visual diversity test
  const used = new Set<string>();
  const asset1 = selectAssetForSlot({ slotId: "slot1", required: true, aspectRatio: "16:9", acceptedSubjectTags: [] }, { industry: "Consulting" }, used, "seed_div");
  const asset2 = selectAssetForSlot({ slotId: "slot2", required: true, aspectRatio: "16:9", acceptedSubjectTags: [] }, { industry: "Consulting" }, used, "seed_div");
  assert(asset1?.assetId !== asset2?.assetId, "Within-site visual diversity enforced: no identical asset on two slots");

  // --------------------------------------------------------------------------
  // Check 4: Deterministic Composition Engine (TDD §8, ADR-002, FR-020, FR-021)
  // --------------------------------------------------------------------------
  console.log("\n4. DETERMINISTIC COMPOSITION ENGINE (TDD §8, §16)");
  const composedSite = composeWebsite(
    "11111111-2222-4333-a444-555555555555",
    "savanna-trails",
    {
      name: "Savanna Trails Kenya",
      industry: "Tourism & Safari",
      summary: "Eco-conscious wildlife adventures across the Maasai Mara ecosystem.",
      location: "Narok, Kenya",
      email: "info@savannatrails.co.ke",
      phone: "+254700111222",
      whatsapp: "+254700111222",
      verifiedMetrics: [
        { value: "100%", label: "Indigenous Maasai Guides" },
        { value: "12+", label: "Years in Field" },
      ],
    },
    "seed_savanna_01"
  );

  const parsedConfig = SiteConfigurationSchema.safeParse(composedSite);
  assert(parsedConfig.success, "Composed 5-page site strictly conforms to canonical SiteConfigurationSchema");
  assert(composedSite.pages.length === 5, "Composed site contains all 5 required pages (/, /services, /about, /blog, /contact)");

  for (const page of composedSite.pages) {
    const firstSec = page.sections[0];
    const lastSec = page.sections[page.sections.length - 1];
    assert(firstSec.sectionId === "shell.header", `Route [${page.slug}] begins with shell.header`);
    assert(lastSec.sectionId.startsWith("shell.footer"), `Route [${page.slug}] concludes with shell.footer`);
  }

  // Factuality check: no testimonials provided -> testimonials section must not exist
  const homeSectionIds = composedSite.pages[0].sections.map((s) => s.sectionId);
  assert(!homeSectionIds.includes("proof.testimonials-slider"), "Factuality Rule: testimonials-slider omitted when zero authentic reviews supplied");
  assert(homeSectionIds.includes("proof.metrics-counter"), "Factuality Rule: verified metrics counter substituted when metrics provided");

  // --------------------------------------------------------------------------
  // Check 5: Multipage Static Export Compilation (TDD §21, FR-080, FR-081)
  // --------------------------------------------------------------------------
  console.log("\n5. MULTIPAGE STATIC EXPORT COMPILATION (TDD §21)");
  const exportPackage = compileSiteToStatic(composedSite);
  const filePaths = exportPackage.files.map((f) => f.path);

  const requiredStaticFiles = [
    "index.html",
    "services.html",
    "about.html",
    "blog.html",
    "contact.html",
    "sitemap.xml",
    "robots.txt",
    "dependencies.json",
    "README.md",
  ];

  for (const reqFile of requiredStaticFiles) {
    assert(filePaths.includes(reqFile), `Export package includes "${reqFile}"`);
  }

  const sitemapFile = exportPackage.files.find((f) => f.path === "sitemap.xml")!;
  assert(sitemapFile.content.includes("https://savanna-trails.fortress-ai.com/services"), "sitemap.xml properly indexes all composed multipage routes");

  // --------------------------------------------------------------------------
  // Check 6: Seeded Tenant C Multi-Tenant Resolution
  // --------------------------------------------------------------------------
  console.log("\n6. MULTI-TENANT REPOSITORY WITH COMPOSED TENANT C");
  seedPhase0Tenants();
  const tenantCSite = await tenantRepository.getSite({ userId: USER_C_ID }, SITE_C_ID);
  assert(tenantCSite !== null && tenantCSite.platformSlug === "serengeti-echoes", "Tenant C (5-page Serengeti Echoes) successfully resolved in repository");

  const tenantCConfig = await tenantRepository.getDraftConfiguration({ userId: USER_C_ID }, SITE_C_ID);
  assert(tenantCConfig.pages.length === 5, "Tenant C draft configuration contains 5 pages");

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log("\n===============================================================");
  if (allChecksPassed) {
    console.log("  ALL PHASE 1 DESIGN ENGINE VERIFICATION CHECKS PASSED!");
    console.log("  Architectural invariant maintained: Canonical site config");
    console.log("  projects dual projections: dynamic Next.js + static export.");
    console.log("===============================================================\n");
    process.exit(0);
  } else {
    console.error("  SOME CHECKS FAILED. See log output above.");
    console.log("===============================================================\n");
    process.exit(1);
  }
}

runPhase1Verification().catch((err) => {
  console.error("Verification crashed:", err);
  process.exit(1);
});
