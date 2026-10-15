/**
 * Fortress AI — Phase 7 Verification Script
 * Validates Static Site Export, Package Generation, Dependency Report,
 * Deployment Guides, Zero-Secret Scanning, and Customer Data Portability.
 *
 * Evaluated against TDD §21.1–§21.5, §29.1–§29.4, §30.1–§30.3, §34.1, §36.1, §40.6;
 * Functional Requirements: FR-080, FR-081, FR-082, FR-084; Risk: R-09.
 */

import http from "http";
import { AddressInfo } from "net";
import { compileSiteHtml } from "../src/core/export/export-compiler";
import { bundleSiteAssets } from "../src/core/export/asset-bundler";
import { scanExportDependencies } from "../src/core/export/dependency-scanner";
import { generateDeploymentConfigs } from "../src/core/export/deployment-guides";
import { scanFilesForSecrets, ExportSecurityViolationError } from "../src/core/export/secret-scanner";
import { buildZipArchive, extractZipArchive } from "../src/core/export/package-bundler";
import { generateDownloadToken, verifyDownloadToken } from "../src/core/export/export-tokens";
import { exportService } from "../src/core/export/export-service";
import { dataPortabilityService } from "../src/core/export/data-portability-service";
import { ExportManifestSchema } from "../src/core/export/types";
import { tenantRepository } from "../src/db/tenant-repository";
import { userRepository } from "../src/db/user-repository";
import { subscriptionRepository } from "../src/db/subscription-repository";
import { invoiceRepository } from "../src/db/invoice-repository";
import { usageCreditRepository } from "../src/db/usage-credit-repository";
import { newsletterRepository } from "../src/db/newsletter-repository";
import { FeatureNotEntitledError } from "../src/core/billing/entitlement-service";
import { seedPhase0Tenants, USER_A_ID, USER_B_ID, USER_C_ID, SITE_A_ID, SITE_C_ID } from "../src/db/seed-data";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ [FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ [PASS] ${message}`);
}

async function runPhase7Verification() {
  console.log("===============================================================================");
  console.log("  FORTRESS AI — PHASE 7 STATIC EXPORT & DATA PORTABILITY VERIFICATION");
  console.log("  Evaluating against TDD §21, §29, §30, §36.1 Exit Criteria & FR-080..FR-084");
  console.log("===============================================================================\n");

  // Reset & Seed database stores
  subscriptionRepository.clearAll();
  invoiceRepository.clearAll();
  usageCreditRepository.clearAll();
  tenantRepository.clearAll();
  newsletterRepository.clearAll();
  userRepository.clearAll();
  seedPhase0Tenants();

  // -------------------------------------------------------------------------
  // Gate 1: Multi-Route Static Compilation & HTML5 Markup (FR-080, TDD §21.1)
  // -------------------------------------------------------------------------
  console.log("--- Section 1: Multi-Route Static HTML5 & CSS Compilation (FR-080) ---");
  const siteConfig = await tenantRepository.getDraftConfiguration({ userId: USER_C_ID }, SITE_C_ID);
  const { files: htmlFiles, routes } = compileSiteHtml(siteConfig);

  assert(routes.length === 5, `Compiled all 5 canonical routes: ${routes.join(", ")}`);
  assert(routes.includes("/"), "Homepage '/' is in routes list");
  assert(routes.includes("/about"), "About page '/about' is in routes list");
  assert(routes.includes("/services"), "Services page '/services' is in routes list");
  assert(routes.includes("/blog"), "Blog index page '/blog' is in routes list");
  assert(routes.includes("/contact"), "Contact page '/contact' is in routes list");

  const indexFile = htmlFiles.find((f) => f.path === "index.html");
  assert(!!indexFile, "Generated root 'index.html'");
  const indexHtml = indexFile!.content as string;
  assert(indexHtml.includes("<!DOCTYPE html>"), "index.html has valid HTML5 doctype declaration");
  assert(indexHtml.includes("<title>"), "index.html contains title tag");
  assert(indexHtml.includes('rel="canonical"'), "index.html contains canonical link tag");
  assert(indexHtml.includes('property="og:title"'), "index.html contains OpenGraph title meta tag");
  assert(indexHtml.includes('name="twitter:card"'), "index.html contains Twitter Card meta tag");
  assert(indexHtml.includes('href="./assets/style.css"'), "index.html links to ./assets/style.css");
  assert(indexHtml.includes('src="./assets/app.js"'), "index.html includes ./assets/app.js script tag");

  const cssFile = htmlFiles.find((f) => f.path === "assets/style.css");
  assert(!!cssFile, "Generated 'assets/style.css'");
  assert((cssFile!.content as string).includes(":root"), "Stylesheet defines :root theme tokens");
  assert((cssFile!.content as string).includes("--theme-"), "Stylesheet defines --theme- CSS variables");

  const jsFile = htmlFiles.find((f) => f.path === "assets/app.js");
  assert(!!jsFile, "Generated 'assets/app.js'");
  assert((jsFile!.content as string).includes("mobile-nav"), "Client script contains mobile-nav drawer toggle");

  // -------------------------------------------------------------------------
  // Gate 2: Media Asset Packaging & Licensing Verification (TDD §21.5, FR-080)
  // -------------------------------------------------------------------------
  console.log("\n--- Section 2: Asset Resolution, Licensing & Manifest Generation (FR-080) ---");
  const { assetFiles, assetManifest, assetsCount } = bundleSiteAssets(siteConfig);

  assert(assetFiles.length > 0, `Bundled ${assetFiles.length} asset output files`);
  assert(assetsCount > 0, `Catalogued ${assetsCount} media slots from site configuration`);
  assert(assetManifest.every((a) => a.licenceValidated), "All bundled assets have verified licenses (licenceValidated: true)");

  const assetManifestFile = assetFiles.find((f) => f.path === "assets-manifest.json");
  assert(!!assetManifestFile, "Generated assets-manifest.json");
  const parsedAssetManifest = JSON.parse(assetManifestFile!.content.toString());
  assert(parsedAssetManifest.siteId === SITE_C_ID, "assets-manifest.json matches current siteId");

  const placeholderFile = assetFiles.find((f) => f.path === "assets/images/placeholder.svg");
  assert(!!placeholderFile, "Generated assets/images/placeholder.svg fallback for offline hosting");

  // -------------------------------------------------------------------------
  // Gate 3: Crawler & SEO Artifacts (TDD §21.2)
  // -------------------------------------------------------------------------
  console.log("\n--- Section 3: Crawler & SEO Artifacts (TDD §21.2) ---");
  const sitemapFile = htmlFiles.find((f) => f.path === "sitemap.xml");
  assert(!!sitemapFile, "Generated sitemap.xml");
  const sitemapContent = sitemapFile!.content as string;
  assert(sitemapContent.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'), "sitemap.xml conforms to sitemaps.org 0.9 XML schema");
  assert(sitemapContent.includes(`<loc>https://${siteConfig.platformSlug}.fortress-ai.com</loc>`), "sitemap.xml contains homepage canonical URL");

  const robotsFile = htmlFiles.find((f) => f.path === "robots.txt");
  assert(!!robotsFile, "Generated robots.txt");
  const robotsContent = robotsFile!.content as string;
  assert(robotsContent.includes("User-agent: *"), "robots.txt allows all user agents");
  assert(robotsContent.includes(`Sitemap: https://${siteConfig.platformSlug}.fortress-ai.com/sitemap.xml`), "robots.txt points to sitemap.xml");

  // -------------------------------------------------------------------------
  // Gate 4: Dependency Scanner & Report (FR-081, TDD §40.6, Risk R-09)
  // -------------------------------------------------------------------------
  console.log("\n--- Section 4: Export Compatibility Matrix & Dependency Report (FR-081, §40.6) ---");
  const { dependencyReport, manifest, manifestJsonContent, reportMarkdownContent } = scanExportDependencies(
    siteConfig,
    routes,
    assetManifest
  );

  // Validate against Zod schema per §40.6
  const validatedManifest = ExportManifestSchema.parse(manifest);
  assert(validatedManifest.siteId === SITE_C_ID, "Export manifest contains correct siteId");
  assert(validatedManifest.exportCompilerVersion === "1.0.0", "Export compiler version pinned to 1.0.0");
  assert(validatedManifest.checks.routes === "passed", "Manifest checks.routes = 'passed'");
  assert(validatedManifest.checks.secretScan === "passed", "Manifest checks.secretScan = 'passed'");

  const contactDep = dependencyReport.features.find((f) => f.feature === "contact-form");
  assert(!!contactDep && contactDep.status === "external-required", "Contact form correctly flagged as 'external-required'");
  assert(contactDep!.action.includes("Formspree"), "Contact form action recommends Formspree/Basin or mailto fallback");

  const analyticsDep = dependencyReport.features.find((f) => f.feature === "platform-analytics");
  assert(!!analyticsDep && analyticsDep.status === "not-included", "Platform analytics correctly flagged as 'not-included'");

  assert(reportMarkdownContent.includes("# Fortress AI — Export Dependency & Compatibility Report"), "Generated formatted DEPENDENCY_REPORT.md");
  assert(reportMarkdownContent.includes("## 2. Feature & Dependency Matrix"), "DEPENDENCY_REPORT.md contains feature matrix table");

  // -------------------------------------------------------------------------
  // Gate 5: Multi-Host Deployment Guides (TDD §21.2)
  // -------------------------------------------------------------------------
  console.log("\n--- Section 5: Multi-Host Deployment Configurations (TDD §21.2) ---");
  const deploymentConfigs = generateDeploymentConfigs(siteConfig, routes);
  const configPaths = deploymentConfigs.map((c) => c.path);

  assert(configPaths.includes("_redirects"), "Generated Netlify '_redirects'");
  assert(configPaths.includes("netlify.toml"), "Generated Netlify 'netlify.toml'");
  assert(configPaths.includes("vercel.json"), "Generated Vercel 'vercel.json'");
  assert(configPaths.includes("_headers"), "Generated Cloudflare Pages '_headers'");
  assert(configPaths.includes(".nojekyll"), "Generated GitHub Pages '.nojekyll'");
  assert(configPaths.includes(".htaccess"), "Generated Apache '.htaccess'");
  assert(configPaths.includes("nginx.conf"), "Generated Nginx 'nginx.conf'");
  assert(configPaths.includes("README.md"), "Generated customer deployment 'README.md'");

  const vercelCfg = deploymentConfigs.find((c) => c.path === "vercel.json");
  const parsedVercel = JSON.parse(vercelCfg!.content as string);
  assert(parsedVercel.cleanUrls === true, "vercel.json has cleanUrls enabled");

  const readmeContent = deploymentConfigs.find((c) => c.path === "README.md")!.content as string;
  assert(readmeContent.includes("## Deployment Quickstart"), "README.md contains quickstart guides for Netlify, Vercel, Cloudflare");

  // -------------------------------------------------------------------------
  // Gate 6: Automated Zero-Secret Scanner (TDD §21.5, §29.3, FR-082)
  // -------------------------------------------------------------------------
  console.log("\n--- Section 6: Zero-Secret Scanner & Invariant Defense (TDD §21.5) ---");
  const cleanFiles = [
    { path: "index.html", content: "<h1>Legal & Tax Advisory</h1>" },
    { path: "assets/style.css", content: "body { color: #333; }" },
  ];
  const scanResult = scanFilesForSecrets(cleanFiles);
  assert(scanResult.passed, "Clean files pass secret audit");

  // Invariant test: Database connection URI leak
  const leakedDbFiles = [
    ...cleanFiles,
    { path: "secrets.env", content: "DATABASE_URL=postgresql://postgres:p@ssword123@db.supabase.co:5432/prod" },
  ];
  let caughtDb = false;
  try {
    scanFilesForSecrets(leakedDbFiles);
  } catch (err: any) {
    caughtDb = err instanceof ExportSecurityViolationError;
  }
  assert(caughtDb, "Secret scanner immediately aborts on database URI with credentials");

  // Invariant test: Provider API key leak
  const leakedApiKeyFiles = [
    ...cleanFiles,
    { path: "app.bundle.js", content: "const BREVO_KEY = 'xkeysib-abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';" },
  ];
  let caughtKey = false;
  try {
    scanFilesForSecrets(leakedApiKeyFiles);
  } catch (err: any) {
    caughtKey = err instanceof ExportSecurityViolationError;
  }
  assert(caughtKey, "Secret scanner immediately aborts on Brevo transactional API key");

  // -------------------------------------------------------------------------
  // Gate 7: Standard PKWARE ZIP Generation & Checksum (FR-080)
  // -------------------------------------------------------------------------
  console.log("\n--- Section 7: PKWARE ZIP Archive Builder & Extraction (FR-080) ---");
  const sampleFiles = [
    { path: "index.html", content: "<h1>Hello Safari</h1>" },
    { path: "about.html", content: "<h1>About Us</h1>" },
    { path: "assets/style.css", content: ":root { --theme-bg: #fff; }" },
  ];
  const { buffer: zipBuffer, sha256, sizeBytes, fileCount } = buildZipArchive(sampleFiles);

  assert(zipBuffer.length > 0, `Built ZIP archive (${sizeBytes} bytes)`);
  assert(sha256.length === 64, `Computed SHA-256 integrity hash: ${sha256.substring(0, 16)}...`);
  assert(fileCount === 3, `Archive contains ${fileCount} files`);
  assert(zipBuffer.readUInt32LE(0) === 0x04034b50, "ZIP buffer begins with PK\\x03\\x04 signature");

  // Unpack and verify bit-for-bit fidelity
  const extracted = extractZipArchive(zipBuffer);
  assert(extracted.size === 3, "Extractor unpacked all 3 files from archive");
  assert(extracted.get("index.html")?.toString("utf-8") === "<h1>Hello Safari</h1>", "Extracted index.html content matches exactly");
  assert(extracted.get("about.html")?.toString("utf-8") === "<h1>About Us</h1>", "Extracted about.html content matches exactly");
  assert(extracted.get("assets/style.css")?.toString("utf-8") === ":root { --theme-bg: #fff; }", "Extracted style.css content matches exactly");

  // -------------------------------------------------------------------------
  // Gate 8: Plan Entitlements & Signed Token Delivery (FR-069, FR-082)
  // -------------------------------------------------------------------------
  console.log("\n--- Section 8: Plan Entitlements & Secure Token Delivery (FR-069, FR-082) ---");

  // Free trial user cannot export without upgrading
  let freeExportBlocked = false;
  try {
    await exportService.compileSitePackage(USER_A_ID, SITE_A_ID);
  } catch (err: any) {
    freeExportBlocked = err instanceof FeatureNotEntitledError;
  }
  assert(freeExportBlocked, "Free plan user is blocked with FeatureNotEntitledError");

  // Give User A an active Starter subscription
  subscriptionRepository.createSubscription({
    userId: USER_A_ID,
    planId: "starter",
    billingInterval: "monthly",
    currency: "USD",
  });

  const exportInitiation = await exportService.initiateExport({
    userId: USER_A_ID,
    siteId: SITE_A_ID,
  });

  assert(exportInitiation.success, "Static export initiation succeeded for paid Starter subscriber");
  assert(exportInitiation.downloadUrl.includes("/api/export/"), "Returned secure download URL");
  assert(exportInitiation.downloadUrl.includes("token="), "Download URL includes signed token parameter");
  assert(exportInitiation.sha256.length === 64, "Export initiation includes SHA-256 package checksum");

  // Extract token from URL
  const tokenMatch = exportInitiation.downloadUrl.match(/token=([a-zA-Z0-9_\-\.]+)/);
  assert(!!tokenMatch, "Extracted signed token from downloadUrl");
  const token = tokenMatch![1];

  const verifyResult = verifyDownloadToken(token);
  assert(verifyResult.valid, "Signed token verifies successfully");
  assert(verifyResult.payload?.siteId === SITE_A_ID, "Token payload contains correct siteId");
  assert(verifyResult.payload?.userId === USER_A_ID, "Token payload contains correct userId");

  // Test expired token rejection
  const expiredToken = generateDownloadToken({ siteId: SITE_A_ID, userId: USER_A_ID, exportId: "exp_test" }, -1000);
  const expiredCheck = verifyDownloadToken(expiredToken);
  assert(!expiredCheck.valid && expiredCheck.reason === "Token has expired", "Expired token is rejected with 'Token has expired'");

  // Test tampered token rejection
  const tamperedToken = `${token.split(".")[0]}.invalid_signature_hash`;
  const tamperedCheck = verifyDownloadToken(tamperedToken);
  assert(!tamperedCheck.valid && tamperedCheck.reason === "Invalid token signature", "Tampered token is rejected with 'Invalid token signature'");

  // -------------------------------------------------------------------------
  // Gate 9: Live Static HTTP Server Smoke Test (TDD §21.2 Step 53, §36.1)
  // -------------------------------------------------------------------------
  console.log("\n--- Section 9: Live Static HTTP Server Smoke Test (TDD §21.2 Step 53, §36.1) ---");

  // Compile full 5-page package for User C
  const pkg = await exportService.compileSitePackage(USER_C_ID, SITE_C_ID, { bypassEntitlements: true });
  const liveExtracted = extractZipArchive(pkg.zipBuffer);

  // Spin up native HTTP server
  const smokeServer = http.createServer((req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    let reqPath = url.pathname.replace(/^\//, "");

    if (reqPath === "" || reqPath.endsWith("/")) {
      reqPath += "index.html";
    }

    let fileBuf = liveExtracted.get(reqPath);
    if (!fileBuf && !reqPath.includes(".")) {
      reqPath = `${reqPath}.html`;
      fileBuf = liveExtracted.get(reqPath);
    }

    if (!fileBuf) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }

    let contentType = "text/plain";
    if (reqPath.endsWith(".html")) contentType = "text/html; charset=utf-8";
    else if (reqPath.endsWith(".css")) contentType = "text/css; charset=utf-8";
    else if (reqPath.endsWith(".js")) contentType = "application/javascript; charset=utf-8";
    else if (reqPath.endsWith(".json")) contentType = "application/json; charset=utf-8";
    else if (reqPath.endsWith(".xml")) contentType = "application/xml; charset=utf-8";
    else if (reqPath.endsWith(".md")) contentType = "text/markdown; charset=utf-8";

    res.writeHead(200, { "Content-Type": contentType, "Content-Length": fileBuf.length });
    res.end(fileBuf);
  });

  const serverPort = await new Promise<number>((resolve) => {
    smokeServer.listen(0, "127.0.0.1", () => {
      resolve((smokeServer.address() as AddressInfo).port);
    });
  });

  const hostUrl = `http://127.0.0.1:${serverPort}`;

  // Request index
  const indexRes = await fetch(`${hostUrl}/`);
  assert(indexRes.status === 200, "GET / -> 200 OK");
  assert(indexRes.headers.get("content-type")?.includes("text/html") || false, "GET / returns text/html");
  const indexBody = await indexRes.text();
  assert(indexBody.includes("<!DOCTYPE html>"), "GET / body is valid HTML5");

  // Request all other routes
  for (const r of ["/about", "/services", "/blog", "/contact"]) {
    const rRes = await fetch(`${hostUrl}${r}`);
    assert(rRes.status === 200, `GET ${r} (Clean URL) -> 200 OK`);
  }

  // Request assets
  const styleRes = await fetch(`${hostUrl}/assets/style.css`);
  assert(styleRes.status === 200, "GET /assets/style.css -> 200 OK");

  const sitemapRes = await fetch(`${hostUrl}/sitemap.xml`);
  assert(sitemapRes.status === 200, "GET /sitemap.xml -> 200 OK");

  const reportRes = await fetch(`${hostUrl}/DEPENDENCY_REPORT.md`);
  assert(reportRes.status === 200, "GET /DEPENDENCY_REPORT.md -> 200 OK");

  // Clean shutdown
  await new Promise<void>((resolve) => smokeServer.close(() => resolve()));
  console.log("  ✓ [PASS] Smoke test server closed cleanly");

  // -------------------------------------------------------------------------
  // Gate 10: Customer Data Portability (FR-084, TDD §30.1–§30.3)
  // -------------------------------------------------------------------------
  console.log("\n--- Section 10: Customer Data Portability (FR-084) ---");
  invoiceRepository.createInvoice({
    userId: USER_A_ID,
    subscriptionId: "sub_test_p7",
    currency: "USD",
    amountMinorUnits: 1900,
    lineItems: [
      {
        description: "Starter Plan (Monthly)",
        amountMinorUnits: 1900,
        quantity: 1,
        category: "subscription",
      },
    ],
  });

  usageCreditRepository.recordDebit({
    userId: USER_A_ID,
    siteId: SITE_A_ID,
    jobId: "job_p7_1",
    jobType: "full_site_generation",
    creditsDeducted: 10,
    idempotencyKey: "idem_p7_1",
  });

  newsletterRepository.recordConsent({
    email: "safari@marahorizon.co.ke",
    status: "subscribed",
    optInSource: "registration_checkbox",
  });

  const accountBundle = await dataPortabilityService.generateAccountExport(USER_A_ID);

  assert(accountBundle.exportVersion === "1.0.0", "Account export version is 1.0.0");
  assert(accountBundle.user.id === USER_A_ID, "Account export matches requested userId");
  assert(accountBundle.sites.length >= 1, "Account export contains user's owned sites and configurations");
  assert(accountBundle.billing.subscription?.planId === "starter", "Account export includes subscription records");
  assert(accountBundle.billing.invoices.length >= 1, "Account export includes invoice history");
  assert(accountBundle.billing.usageHistory.length >= 1, "Account export includes AI credit ledger");
  assert(accountBundle.privacyAndConsent.newsletterConsent?.status === "subscribed", "Account export includes consent status");

  const bundleJson = JSON.stringify(accountBundle);
  assert(!bundleJson.includes("passwordHash"), "Invariant: Account export never contains passwordHash");
  assert(!bundleJson.includes("INTASEND_SECRET_KEY"), "Invariant: Account export never contains provider secret keys");
  assert(!bundleJson.includes(USER_B_ID), "Invariant: Account export never leaks another tenant's records");

  console.log("\n===============================================================================");
  console.log("  🎉 ALL 10 PHASE 7 ACCEPTANCE GATES PASSED (100%)");
  console.log("  Static Site Export, Package Generation, Dependency Report,");
  console.log("  Multi-Host Deployment Guides & Customer Data Portability are verified!");
  console.log("===============================================================================");
}

runPhase7Verification().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
