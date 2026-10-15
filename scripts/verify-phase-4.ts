import { tenantRepository } from "../src/db/tenant-repository";
import { releaseRepository } from "../src/db/release-repository";
import { domainRepository } from "../src/db/domain-repository";
import { auditRepository } from "../src/db/audit-repository";
import { notificationRepository } from "../src/db/notification-repository";
import { PublishOrchestrator } from "../src/core/publish/publish-orchestrator";
import { RollbackService } from "../src/core/publish/rollback-service";
import { SeoGenerator } from "../src/core/publish/seo-generator";
import { maraHorizonConfig } from "../src/db/seed-data";
import { ValidationError } from "../src/core/errors";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  ✗ [FAIL] ${msg}`);
    process.exit(1);
  }
  console.log(`  ✓ [PASS] ${msg}`);
}

async function runPhase4Verification() {
  console.log("===============================================================");
  console.log("  FORTRESS AI — PHASE 4 MANAGED PUBLISH & EDGE ROUTING VERIFICATION");
  console.log("  Evaluating against TDD §7, §20, §23, §25, §33, §34, §36 Exit Criteria");
  console.log("===============================================================\n");

  const runId = Date.now();
  const userId = `usr_verify_p4_${runId}`;
  const siteSlug = `safari-verify-${runId}`;

  // Reset / initialize test state
  tenantRepository.clearAll();
  releaseRepository.clearAll();
  domainRepository.clearAll();
  auditRepository.clearAll();
  notificationRepository.clearAll();

  // Create test site with membership
  const site = await tenantRepository.createSite(
    userId,
    "Mara Wilderness Trails",
    siteSlug,
    maraHorizonConfig
  );
  const siteId = site.id;

  // 1. PRE-FLIGHT VALIDATION & ELIGIBILITY (TDD §20.2 #38, FR-035)
  console.log("1. PRE-FLIGHT VALIDATION & ELIGIBILITY (TDD §20.2 #38, FR-035)");
  const validConfig = maraHorizonConfig;
  assert(
    (() => {
      PublishOrchestrator.validatePreFlight(validConfig);
      return true;
    })(),
    "Valid canonical configuration passes pre-flight checks"
  );

  const brokenConfigNoHome = JSON.parse(JSON.stringify(validConfig));
  brokenConfigNoHome.pages = brokenConfigNoHome.pages.filter(
    (p: any) => p.slug !== "home" && p.slug !== "/"
  );
  let noHomeRejected = false;
  try {
    PublishOrchestrator.validatePreFlight(brokenConfigNoHome);
  } catch (err) {
    if (err instanceof ValidationError) noHomeRejected = true;
  }
  assert(noHomeRejected, "Pre-flight rejects configuration missing a home/root page");

  const brokenConfigBadSection = JSON.parse(JSON.stringify(validConfig));
  brokenConfigBadSection.pages[0].sections.push({
    instanceId: "unknown_sec",
    manifestId: "nonexistent.manifest.id",
    content: {},
  });
  let badSectionRejected = false;
  try {
    PublishOrchestrator.validatePreFlight(brokenConfigBadSection);
  } catch (err) {
    if (err instanceof ValidationError) badSectionRejected = true;
  }
  assert(badSectionRejected, "Pre-flight rejects unknown or unreleased section manifest IDs");

  // 2. FRESH SITE PUBLICATION & IMMUTABLE RELEASE (TDD §20.1, §20.2, FR-033, FR-035)
  console.log("\n2. FRESH SITE PUBLICATION & IMMUTABLE RELEASE (TDD §20.1, §20.2, FR-033, FR-035)");
  const initialSite = tenantRepository.getSiteDirect(siteId)!;
  assert(initialSite.publishedReleaseId === undefined, "Initial site is unpublished (no release pointer)");
  assert(initialSite.lifecycleStatus === "draft", "Initial site lifecycle status is draft");

  const publish1 = await PublishOrchestrator.publishSite(siteId, userId, "Initial Live Release");
  assert(publish1.release.releaseNumber === 1, "First publish generates Release #1");
  assert(publish1.release.artefactHash !== undefined && publish1.release.artefactHash.length === 64, "Generated SHA-256 configuration snapshot artefact hash");
  assert(publish1.release.healthStatus === "healthy", "Release healthStatus is healthy");
  assert(publish1.release.publishedByUserId === userId, "Release records publishing actor user ID");

  const updatedSite1 = tenantRepository.getSiteDirect(siteId)!;
  assert(updatedSite1.publishedReleaseId === publish1.release.id, "Atomic pointer swap: site.publishedReleaseId points to Release #1");
  assert(updatedSite1.lifecycleStatus === "published", "Site lifecycleStatus transitioned to published");

  // Audit and notification checks
  const auditEvents1 = auditRepository.listEvents({ targetType: "site", targetId: siteId });
  const publishAudit = auditEvents1.find((e) => e.action === "site.publish");
  assert(publishAudit !== undefined, "Recorded non-repudiable site.publish audit event");
  assert(publishAudit?.metadata?.releaseId === publish1.release.id, "Audit event metadata links to Release #1 ID");

  const notifications1 = notificationRepository.listForUser(userId);
  const buildSuccessNotif = notifications1.find((n) => n.type === "BUILD_SUCCEEDED");
  assert(buildSuccessNotif !== undefined, "Dispatched tenant in-app notification for published release");

  // 3. STRICT DRAFT ISOLATION (TDD §7.1, FR-034)
  console.log("\n3. STRICT DRAFT ISOLATION (TDD §7.1, FR-034)");
  const getHeroHeadline = (cfg: any) =>
    cfg.pages[0].sections.find((s: any) => s.content?.headline)?.content?.headline || "";

  const v1HeroHeadline = getHeroHeadline(publish1.release.config);

  // Make an unapproved draft edit in workspace
  const draftMutated = JSON.parse(JSON.stringify(maraHorizonConfig));
  const heroToMutate = draftMutated.pages[0].sections.find((s: any) => s.content?.headline);
  heroToMutate.content.headline = "WIP UNPUBLISHED HEADLINE: Summer 2026 Sale!";
  await tenantRepository.saveRevision(
    { userId },
    siteId,
    draftMutated,
    "Unpublished draft revision"
  );

  const activePublicRelease = releaseRepository.getRelease(updatedSite1.publishedReleaseId!)!;
  assert(
    getHeroHeadline(activePublicRelease.config) === v1HeroHeadline,
    "Public active release retains frozen Release #1 content"
  );
  assert(
    !getHeroHeadline(activePublicRelease.config).includes("WIP UNPUBLISHED"),
    "Zero draft leakage: unapproved draft edits are strictly isolated from public traffic"
  );

  // 4. SUBSEQUENT RELEASE ACTIVATION (TDD §20.1, FR-033)
  console.log("\n4. SUBSEQUENT RELEASE ACTIVATION (TDD §20.1, FR-033)");
  const publish2 = await PublishOrchestrator.publishSite(siteId, userId, "Release #2 with updated headline");
  assert(publish2.release.releaseNumber === 2, "Second publish generates sequential Release #2");

  const updatedSite2 = tenantRepository.getSiteDirect(siteId)!;
  assert(updatedSite2.publishedReleaseId === publish2.release.id, "Atomic pointer swap: site.publishedReleaseId updated to Release #2");

  const activeRelease2 = releaseRepository.getRelease(updatedSite2.publishedReleaseId!)!;
  assert(
    getHeroHeadline(activeRelease2.config).includes("Summer 2026 Sale!"),
    "Public release now serves updated Release #2 content"
  );

  // 5. INSTANT ROLLBACK & IMMUTABILITY INVARIANT (TDD §33.3, FR-036)
  console.log("\n5. INSTANT ROLLBACK & IMMUTABILITY INVARIANT (TDD §33.3, FR-036)");
  const rollbackResult = await RollbackService.rollbackSite(siteId, publish1.release.id, userId);
  assert(rollbackResult.restoredRelease.id === publish1.release.id, "Rollback successfully targeted Release #1");
  assert(rollbackResult.fromReleaseId === publish2.release.id, "Rollback tracked previous active Release #2");

  const siteAfterRollback = tenantRepository.getSiteDirect(siteId)!;
  assert(siteAfterRollback.publishedReleaseId === publish1.release.id, "Atomic pointer swap: site.publishedReleaseId reverted to Release #1");

  const currentActiveRelease = releaseRepository.getRelease(siteAfterRollback.publishedReleaseId!)!;
  assert(
    getHeroHeadline(currentActiveRelease.config) === v1HeroHeadline,
    "Public release instantly serves restored Release #1 content"
  );

  // Immutability invariant: Release #2 is NOT deleted
  const allHistoricalReleases = releaseRepository.listReleasesForSite(siteId);
  assert(allHistoricalReleases.length === 2, "Release history retains all releases (length: 2)");
  assert(
    allHistoricalReleases.some((r) => r.id === publish2.release.id),
    "Non-destructive rollback: Release #2 remains intact in historical records"
  );

  const rollbackAuditEvent = auditRepository.listEvents({ targetType: "site", targetId: siteId })
    .find((e) => e.action === "site.rollback");
  assert(rollbackAuditEvent !== undefined, "Recorded audited site.rollback event with actor ID");

  // 6. MULTI-TENANT HOSTNAME & SUBDOMAIN RESOLUTION (TDD §7.1, FR-060, FR-061)
  console.log("\n6. MULTI-TENANT HOSTNAME & SUBDOMAIN RESOLUTION (TDD §7.1, FR-060, FR-061)");
  const resolvedSubdomain = domainRepository.resolveSiteIdFromHostname(`${siteSlug}.fortressai.app`);
  assert(resolvedSubdomain?.siteId === siteId, "Platform subdomain resolves accurately to site ID");

  const customHostname = `safaris-${runId}.kenya.co.ke`;
  domainRepository.createDomain(siteId, customHostname, "custom_apex", false);

  assert(
    domainRepository.resolveSiteIdFromHostname(customHostname) === null,
    "Unverified custom domain is not active prior to DNS check"
  );

  domainRepository.verifyDomain(customHostname);
  const resolvedCustom = domainRepository.resolveSiteIdFromHostname(customHostname);
  assert(resolvedCustom?.siteId === siteId, "Verified custom domain resolves accurately to site ID");

  assert(
    domainRepository.resolveSiteIdFromHostname("unknown-random-domain-xyz.com") === null,
    "Unknown hostname returns null (never guesses tenant, TDD §7.1 #13)"
  );

  let collisionPrevented = false;
  try {
    domainRepository.createDomain("other_site_id", customHostname, "custom_apex");
  } catch {
    collisionPrevented = true;
  }
  assert(collisionPrevented, "Cross-tenant hostname collision is strictly prevented");

  // 7. DETERMINISTIC SEO, SITEMAP & ROBOTS GENERATION (TDD §16.5, FR-045, FR-046, FR-047)
  console.log("\n7. DETERMINISTIC SEO, SITEMAP & ROBOTS GENERATION (TDD §16.5, FR-045, FR-046, FR-047)");
  const baseUrl = `https://${siteSlug}.fortressai.app`;
  const seoMetadata = SeoGenerator.generateAllMetadata(maraHorizonConfig, baseUrl, true);

  assert(seoMetadata["home"] !== undefined, "Generated SEO metadata for home route");
  assert(seoMetadata["home"].title.includes("Mara"), "SEO title contains business name");
  assert(seoMetadata["home"].canonicalUrl === `${baseUrl}/`, "Canonical URL matches public base URL");
  assert(seoMetadata["home"].description.length <= 160, "Meta description truncated within length guidance");
  assert(seoMetadata["home"].noindex === false, "Published SEO metadata enables indexing (noindex: false)");

  const multiPageConfig = JSON.parse(JSON.stringify(maraHorizonConfig));
  multiPageConfig.pages.push({
    pageId: "page_about",
    slug: "/about",
    title: "About Us",
    pageType: "about",
    seo: { title: "About Us", description: "Our story" },
    sections: [],
  });

  const sitemapXml = SeoGenerator.generateSitemapXml(multiPageConfig, baseUrl);
  assert(sitemapXml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), "Sitemap has valid XML header");
  assert(sitemapXml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'), "Sitemap uses standard sitemaps schema");
  assert(sitemapXml.includes(`<loc>${baseUrl}/</loc>`), "Sitemap indexes homepage");
  assert(sitemapXml.includes(`<loc>${baseUrl}/about</loc>`), "Sitemap indexes about page");

  const robotsTxt = SeoGenerator.generateRobotsTxt(baseUrl);
  assert(robotsTxt.includes("User-agent: *"), "Robots.txt contains User-agent directive");
  assert(robotsTxt.includes("Allow: /"), "Robots.txt allows public routes");
  assert(robotsTxt.includes("Disallow: /api/"), "Robots.txt disallows internal /api/");
  assert(robotsTxt.includes("Disallow: /preview/"), "Robots.txt disallows private /preview/");
  assert(robotsTxt.includes(`Sitemap: ${baseUrl}/sitemap.xml`), "Robots.txt points to sitemap");

  const structuredData = SeoGenerator.generateStructuredData(
    maraHorizonConfig,
    maraHorizonConfig.pages[0],
    baseUrl
  );
  assert(structuredData["@context"] === "https://schema.org", "Schema.org context specified");
  assert(
    structuredData["name"] === SeoGenerator.getBusinessName(maraHorizonConfig),
    "Business name mapped accurately"
  );
  assert(!("aggregateRating" in structuredData), "Zero-testimonial invariant: no invented aggregateRating");
  assert(!("review" in structuredData), "Zero-testimonial invariant: no invented reviews");

  // Teardown test artifacts
  tenantRepository.deleteSitePermanently(siteId);
  releaseRepository.deleteReleasesForSite(siteId);
  domainRepository.deleteDomain(customHostname);

  console.log("\n===============================================================");
  console.log("  RESULT: ALL PHASE 4 VERIFICATION CHECKS PASSED (100%)");
  console.log("  Managed Publish, Edge CDN & DNS Automation compliant with TDD v1.0.");
  console.log("===============================================================\n");
}

runPhase4Verification().catch((err) => {
  console.error("Verification failed with unexpected error:", err);
  process.exit(1);
});
