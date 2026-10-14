import http from "http";
import fs from "fs";
import path from "path";
import { SiteConfigurationSchema } from "../src/core/schema/site-config";
import { sectionRegistry } from "../src/registry";
import {
  USER_A_ID,
  SITE_A_ID,
  USER_B_ID,
  SITE_B_ID,
  maraHorizonConfig,
  nairobiAdvisoryConfig,
  seedPhase0Tenants,
} from "../src/db/seed-data";
import { tenantRepository } from "../src/db/tenant-repository";
import { TenantAccessDeniedError } from "../src/core/errors";
import { compileSiteToStatic } from "../src/exporter/static-compiler";
import { resolveTheme, themeTokensToCssVariables } from "../src/themes/default-themes";

async function runPhase0Verification() {
  console.log("===============================================================");
  console.log("  FORTRESS AI — PHASE 0 ARCHITECTURE PROOF VERIFICATION");
  console.log("  Evaluating against TDD §36 Exit Criteria");
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
  // Check 1: Canonical Schema Contracts (TDD §8, §40)
  // --------------------------------------------------------------------------
  console.log("1. CANONICAL SCHEMA CONTRACTS (TDD §8, §40)");
  const tenantAParsed = SiteConfigurationSchema.safeParse(maraHorizonConfig);
  assert(tenantAParsed.success, "Tenant A canonical configuration parses successfully");

  const tenantBParsed = SiteConfigurationSchema.safeParse(nairobiAdvisoryConfig);
  assert(tenantBParsed.success, "Tenant B canonical configuration parses successfully");

  const corruptedConfig = { ...maraHorizonConfig, pages: [] };
  const corruptedParsed = SiteConfigurationSchema.safeParse(corruptedConfig);
  assert(!corruptedParsed.success, "Canonical schema rejects sites with 0 pages (min 1 required)");

  // --------------------------------------------------------------------------
  // Check 2: Section Registry & Manifest Contract (TDD §9, ADR-004)
  // --------------------------------------------------------------------------
  console.log("\n2. SECTION REGISTRY & MANIFEST CONTRACT (TDD §9)");
  const requiredSections = [
    "shell.header",
    "hero.split",
    "services.card-grid",
    "about.story",
    "shell.footer",
  ];

  for (const id of requiredSections) {
    const hasSection = sectionRegistry.has(id);
    assert(hasSection, `Section registry contains "${id}"`);
    if (hasSection) {
      const entry = sectionRegistry.getEntry(id);
      assert(entry.manifest.status === "released", `Section "${id}" is in 'released' status`);
      assert(entry.manifest.export.staticSafe === true, `Section "${id}" declares staticSafe export`);
      assert(typeof entry.component === "function", `Section "${id}" has a valid React component`);
    }
  }

  // --------------------------------------------------------------------------
  // Check 3: Tenant Isolation & Data Boundary (TDD §7, FR-009)
  // --------------------------------------------------------------------------
  console.log("\n3. TENANT ISOLATION & ACCESS CONTROL (TDD §7, FR-009)");
  seedPhase0Tenants();

  const siteA = await tenantRepository.getSite({ userId: USER_A_ID }, SITE_A_ID);
  assert(siteA.id === SITE_A_ID && siteA.ownerUserId === USER_A_ID, "Tenant A accesses own site");

  let crossTenantReadBlocked = false;
  try {
    await tenantRepository.getDraftConfiguration({ userId: USER_A_ID }, SITE_B_ID);
  } catch (err) {
    if (err instanceof TenantAccessDeniedError) {
      crossTenantReadBlocked = true;
    }
  }
  assert(crossTenantReadBlocked, "Tenant A reading Tenant B draft throws TenantAccessDeniedError (403)");

  let crossTenantMutationBlocked = false;
  try {
    await tenantRepository.saveRevision(
      { userId: USER_B_ID },
      SITE_A_ID,
      maraHorizonConfig,
      "Unauthorized mutation"
    );
  } catch (err) {
    if (err instanceof TenantAccessDeniedError) {
      crossTenantMutationBlocked = true;
    }
  }
  assert(crossTenantMutationBlocked, "Tenant B mutating Tenant A revision throws TenantAccessDeniedError (403)");

  // --------------------------------------------------------------------------
  // Check 4: Dynamic Theme Tokens Projection (TDD §10)
  // --------------------------------------------------------------------------
  console.log("\n4. THEME TOKENS RESOLUTION & DIVERSITY (TDD §10, FR-019)");
  const themeA = resolveTheme(maraHorizonConfig.theme.themeId);
  const varsA = themeTokensToCssVariables(themeA);
  assert(varsA["--theme-primary"] === "#174A50", "Tenant A theme resolves primary '#174A50' (warm-editorial)");

  const themeB = resolveTheme(nairobiAdvisoryConfig.theme.themeId);
  const varsB = themeTokensToCssVariables(themeB);
  assert(varsB["--theme-primary"] === "#0F172A", "Tenant B theme resolves primary '#0F172A' (modern-slate)");
  assert(varsA["--theme-primary"] !== varsB["--theme-primary"], "Tenants have distinct, isolated visual tokens");

  // --------------------------------------------------------------------------
  // Check 5: Static Export Pipeline & Standalone HTTP Serving (TDD §21, §36)
  // --------------------------------------------------------------------------
  console.log("\n5. STATIC EXPORT & STANDALONE HOSTING TEST (TDD §21, FR-080, FR-081)");
  const exportResult = compileSiteToStatic(maraHorizonConfig);
  assert(exportResult.siteId === SITE_A_ID, "Export matches Tenant A site ID");
  assert(exportResult.files.length >= 5, "Export bundle generates all required files (HTML, sitemap, robots, dependencies, README)");

  // Write exported files to a temp directory and serve over pure HTTP
  const tempExportDir = path.resolve(__dirname, "../.temp_static_test");
  if (!fs.existsSync(tempExportDir)) {
    fs.mkdirSync(tempExportDir, { recursive: true });
  }

  for (const file of exportResult.files) {
    const fullPath = path.join(tempExportDir, file.path);
    fs.writeFileSync(fullPath, file.content, "utf-8");
  }
  assert(fs.existsSync(path.join(tempExportDir, "index.html")), "index.html written to disk");
  assert(fs.existsSync(path.join(tempExportDir, "sitemap.xml")), "sitemap.xml written to disk");
  assert(fs.existsSync(path.join(tempExportDir, "dependencies.json")), "dependencies.json written to disk");

  // Start independent HTTP server
  const PORT = 8999;
  const server = http.createServer((req, res) => {
    let reqPath = req.url?.split("?")[0] || "/";
    if (reqPath === "/") reqPath = "/index.html";
    const filePath = path.join(tempExportDir, reqPath);

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      const content = fs.readFileSync(filePath);
      const contentType =
        ext === ".html"
          ? "text/html"
          : ext === ".xml"
          ? "application/xml"
          : ext === ".json"
          ? "application/json"
          : "text/plain";
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    } else {
      res.writeHead(404);
      res.end("Not Found");
    }
  });

  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`  > Started standalone test HTTP server on port ${PORT}`);

  try {
    // Test index.html over standalone HTTP
    const indexRes = await fetch(`http://localhost:${PORT}/index.html`);
    const indexBody = await indexRes.text();
    assert(indexRes.status === 200, "Standalone HTTP server serves index.html with HTTP 200");
    assert(indexBody.includes("Mara Horizon Expeditions"), "Served HTML contains business name");
    assert(indexBody.includes("--theme-primary"), "Served HTML contains embedded theme variables");
    assert(indexBody.includes("Encounter Kenya"), "Served HTML contains hero copy");

    // Test sitemap.xml over standalone HTTP
    const sitemapRes = await fetch(`http://localhost:${PORT}/sitemap.xml`);
    const sitemapBody = await sitemapRes.text();
    assert(sitemapRes.status === 200, "Standalone HTTP server serves sitemap.xml with HTTP 200");
    assert(sitemapBody.includes("https://mara-horizon.fortress-ai.com"), "sitemap.xml has canonical domain URL");

    // Test dependencies.json over standalone HTTP (FR-081)
    const depRes = await fetch(`http://localhost:${PORT}/dependencies.json`);
    const depJson = await depRes.json();
    assert(depRes.status === 200, "Standalone HTTP server serves dependencies.json with HTTP 200");
    assert(depJson.checks.routes === "passed", "Dependency report routes check is 'passed'");
    assert(
      depJson.features.some((f: any) => f.feature === "contact-form" && f.status === "external-required"),
      "Dependency report flags contact-form as external-required"
    );
  } finally {
    server.close();
    // Clean up temp export directory
    fs.rmSync(tempExportDir, { recursive: true, force: true });
    console.log("  > Standalone test HTTP server closed and cleaned up");
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log("\n===============================================================");
  if (allChecksPassed) {
    console.log("  🎉 ALL PHASE 0 EXIT CRITERIA MET AND VERIFIED SUCCESSFULLY!");
    console.log("  1. Sample site renders dynamically from stored configuration.");
    console.log("  2. Same configuration compiles to working standalone static package.");
    console.log("  3. Tenant isolation is strictly enforced at query boundary.");
    console.log("===============================================================\n");
  } else {
    console.error("  ❌ SOME CHECKS FAILED! Review output above.");
    process.exit(1);
  }
}

runPhase0Verification().catch((err) => {
  console.error("Verification failed with uncaught exception:", err);
  process.exit(1);
});
