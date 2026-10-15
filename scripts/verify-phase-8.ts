import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import { GET as healthCheckRoute } from "../src/app/api/health/route";
import { redactString, redactObject } from "../src/core/observability/redaction";
import { metricsCollector } from "../src/core/observability/metrics-collector";
import { backupService } from "../src/core/backup/backup-service";
import { recoveryService } from "../src/core/backup/recovery-service";
import { auditRepository } from "../src/db/audit-repository";
import { auditService } from "../src/core/audit/audit-service";
import { RbacGuard } from "../src/core/auth/rbac-guard";
import { GET as adminOverviewRoute } from "../src/app/api/admin/overview/route";
import { promptRegistry, PromptVersionRecord } from "../src/core/ai/prompt-registry";
import { evaluationHarness } from "../src/core/ai/evaluation-harness";
import { legalPolicyRepository } from "../src/db/legal-policy-repository";
import { policyService } from "../src/core/legal/policy-service";
import { rateLimiter } from "../src/core/security/rate-limiter";
import { middleware } from "../src/proxy";
import { allManifests } from "../src/registry";
import { compileSiteHtml } from "../src/core/export/export-compiler";
import { defaultThemes } from "../src/themes/default-themes";
import { calculateContrastRatio } from "../src/themes/contrast";
import { seedPhase0Tenants, USER_A_ID, SITE_A_ID, maraHorizonConfig } from "../src/db/seed-data";
import { NextRequest } from "next/server";

async function runPhase8Verification() {
  console.log("===============================================================================");
  console.log("  FORTRESS AI — PHASE 8 PRODUCTION HARDENING & LAUNCH READINESS VERIFICATION");
  console.log("  Evaluating against TDD §31–§36, §41–§42 Exit Criteria & FR-085..FR-090");
  console.log("===============================================================================\n");

  seedPhase0Tenants();
  auditRepository.clearAll();
  metricsCollector.reset();
  rateLimiter.clearAll();

  // -------------------------------------------------------------------------
  // Gate 1: Multi-System Health Probes (FR-089, TDD §31, §32.1)
  // -------------------------------------------------------------------------
  console.log("--- Gate 1: Multi-System Health Probes (/api/health) ---");
  const healthRes = await healthCheckRoute();
  assert(healthRes.status === 200, "Health check endpoint returns HTTP 200 OK");

  const healthJson = await healthRes.json();
  assert(healthJson.status === "healthy", "Overall platform health status is 'healthy'");
  assert(healthJson.version === "1.0.0", "Health response identifies platform version 1.0.0");
  assert(healthJson.subsystems.storage.status === "healthy", "Storage subsystem probe is healthy");
  assert(healthJson.subsystems.aiProvider.status === "healthy", "AI provider probe is healthy");
  assert(healthJson.subsystems.registrar.status === "healthy", "Registrar adapter probe is healthy");
  assert(healthJson.subsystems.email.status === "healthy", "Email service probe is healthy");
  assert(healthJson.subsystems.queues.status === "healthy", "Queue & workflow engine is healthy");
  console.log("  ✓ [PASS] /api/health reports all 5 subsystems healthy with latency telemetry");

  // -------------------------------------------------------------------------
  // Gate 2: PII, Bearer Token & Secret Redaction (TDD §32.2)
  // -------------------------------------------------------------------------
  console.log("\n--- Gate 2: PII & Secret Redaction in Telemetry ---");
  const unredactedText =
    "Card 4111-2222-3333-4444 authorized. Token: Bearer jwt_secret_12345. Key: xkeysib-998877665544.";
  const redactedText = redactString(unredactedText);

  assert(!redactedText.includes("4111-2222-3333-4444"), "Credit card digits redacted");
  assert(redactedText.includes("****-****-****-4444"), "Card masked to last 4 digits");
  assert(!redactedText.includes("jwt_secret_12345"), "Bearer token redacted");
  assert(!redactedText.includes("xkeysib-998877665544"), "Brevo API secret key redacted");

  const nestedTelemetry = {
    user: { id: "u1", passwordHash: "$scrypt$secret_hash" },
    payment: { apiKey: "sk_live_secretkey" },
    prompt: "Write a high-converting website for Safari Tours",
  };
  const scrubbedObj = redactObject(nestedTelemetry);
  assert(scrubbedObj.user.passwordHash === "[REDACTED_SECRET]", "Password hash deeply redacted");
  assert(scrubbedObj.payment.apiKey === "[REDACTED_TOKEN]", "API key deeply redacted");
  assert(scrubbedObj.prompt.includes("[REDACTED_PROMPT"), "Raw prompt content redacted in logs");
  console.log("  ✓ [PASS] Universal redaction engine strictly scrubs card numbers, tokens, and prompts");

  // -------------------------------------------------------------------------
  // Gate 3: Automated Backup Snapshot & SHA-256 Checksum (FR-085, TDD §35.1)
  // -------------------------------------------------------------------------
  console.log("\n--- Gate 3: Automated Backup Snapshot & Checksum Integrity (FR-085) ---");
  const snapshotMeta = await backupService.createSnapshot();

  assert(snapshotMeta.snapshotId.startsWith("snapshot_"), "Snapshot assigned unique ID");
  assert(snapshotMeta.sha256.length === 64, "Computed SHA-256 integrity hash for snapshot archive");
  assert(snapshotMeta.fileCount > 0, "Snapshot captured data files from storage");
  assert(snapshotMeta.archiveSizeBytes > 0, "Compressed archive created on disk");
  assert(snapshotMeta.rpoHoursTarget === 24, "Snapshot declares RPO target of 24 hours");
  assert(snapshotMeta.rtoHoursTarget === 8, "Snapshot declares RTO target of 8 hours");

  const rawSnapshot = backupService.getSnapshot(snapshotMeta.snapshotId);
  assert(rawSnapshot !== null, "Snapshot archive retrieved from persistent backup store");
  assert(rawSnapshot!.buffer.length === snapshotMeta.archiveSizeBytes, "Snapshot buffer size matches manifest");
  console.log(`  ✓ [PASS] Backup snapshot created (${snapshotMeta.fileCount} files, ${snapshotMeta.archiveSizeBytes} bytes, SHA-256: ${snapshotMeta.sha256.slice(0, 16)}...)`);

  // -------------------------------------------------------------------------
  // Gate 4: Disaster Recovery Restoration Drill (FR-085, TDD §35.2)
  // -------------------------------------------------------------------------
  console.log("\n--- Gate 4: Disaster Recovery Restoration Drill (RPO <= 24h, RTO <= 8h) ---");
  const testSandboxDir = path.join(process.cwd(), ".data", "verify_dr_sandbox");
  if (fs.existsSync(testSandboxDir)) fs.rmSync(testSandboxDir, { recursive: true, force: true });

  const drillResult = await recoveryService.executeRestoreDrill(rawSnapshot!.buffer, testSandboxDir);

  assert(drillResult.success, "Disaster recovery restoration drill succeeded");
  assert(drillResult.integrityVerified, "Restored data integrity verified against manifest");
  assert(drillResult.rtoSatisfied, "Restoration satisfied RTO target (< 8 hours)");
  assert(drillResult.rpoSatisfied, "Restoration satisfied RPO target (snapshot <= 24h old)");
  assert(drillResult.durationMs < 5000, `Restoration executed rapidly in ${drillResult.durationMs}ms`);
  assert(drillResult.filesRestored > 0, "All entity stores restored to disk");

  // Clean up
  backupService.deleteSnapshot(snapshotMeta.snapshotId);
  if (fs.existsSync(testSandboxDir)) fs.rmSync(testSandboxDir, { recursive: true, force: true });
  console.log(`  ✓ [PASS] DR restore drill restored ${drillResult.filesRestored} files in ${drillResult.durationMs}ms with 100% integrity`);

  // -------------------------------------------------------------------------
  // Gate 5: Tamper-Evident Append-Only Audit Logging (FR-086, TDD §32.3)
  // -------------------------------------------------------------------------
  console.log("\n--- Gate 5: Tamper-Evident Append-Only Audit Logging (FR-086) ---");
  const auditEntry = auditService.logPublish(SITE_A_ID, USER_A_ID, "rel_v1_test", 1);
  assert(auditEntry.id !== undefined, "Audit event recorded with UUID");
  assert(auditEntry.action === "site.published", "Audit action recorded");

  const rollbackEntry = auditService.logRollback(SITE_A_ID, USER_A_ID, "rel_v2", "rel_v1", "Defective section variant");
  assert(rollbackEntry.reason === "Defective section variant", "Rollback reason recorded");

  const history = auditService.reconstructLifecycle(SITE_A_ID);
  assert(history.length >= 2, "Reconstructed full site release and rollback history from audit logs");

  let deleteBlocked = false;
  try {
    auditRepository.deleteEvent();
  } catch (err: any) {
    deleteBlocked = err.message.includes("immutable and append-only");
  }
  assert(deleteBlocked, "Invariant: Audit records are immutable and cannot be deleted");
  console.log("  ✓ [PASS] Audit repository is append-only, reconstructs lifecycle, and prohibits deletion");

  // -------------------------------------------------------------------------
  // Gate 6: RBAC Role Separation & Admin Operations (FR-087, TDD §32.4, §42.3)
  // -------------------------------------------------------------------------
  console.log("\n--- Gate 6: RBAC Role Separation & Admin Operations Console (FR-087) ---");
  let curatorBlocked = false;
  try {
    RbacGuard.assertBillingAccess("curator");
  } catch {
    curatorBlocked = true;
  }
  assert(curatorBlocked, "Curator role blocked from accessing billing records");

  let supportSecretsBlocked = false;
  try {
    RbacGuard.assertSecretsAccess("support");
  } catch {
    supportSecretsBlocked = true;
  }
  assert(supportSecretsBlocked, "Support role blocked from viewing infrastructure secrets");

  let adminWriteBlockedWithoutReason = false;
  try {
    RbacGuard.assertAdminMutation("admin", "");
  } catch {
    adminWriteBlockedWithoutReason = true;
  }
  assert(adminWriteBlockedWithoutReason, "Admin mutations strictly require a mandatory documented reason");

  const adminReq = new NextRequest("http://localhost:3000/api/admin/overview", {
    headers: { "x-user-role": "admin" },
  });
  const adminRes = await adminOverviewRoute(adminReq);
  assert(adminRes.status === 200, "Admin overview endpoint responds with HTTP 200 OK");
  const adminJson = await adminRes.json();
  assert(adminJson.panels.generationHealth !== undefined, "Admin console surfaces generation health");
  assert(adminJson.panels.publishingHealth !== undefined, "Admin console surfaces publishing health");
  assert(adminJson.panels.domainOperations !== undefined, "Admin console surfaces domain operations");
  console.log("  ✓ [PASS] Strict RBAC role boundaries enforced; operational overview aggregates all required panels");

  // -------------------------------------------------------------------------
  // Gate 7: Pinned Prompt Registry & Quality Evaluation (FR-088, TDD §10, §34.2)
  // -------------------------------------------------------------------------
  console.log("\n--- Gate 7: Pinned Prompt Registry & Canary Rollback (FR-088) ---");
  const v1 = promptRegistry.getActivePromptVersion();
  assert(v1.version === "1.0.0", "Active prompt version is 1.0.0");
  assert(v1.status === "approved", "Active prompt is marked approved");

  // Canary registration and promotion
  const canary: PromptVersionRecord = {
    version: "1.1.0-canary",
    status: "canary",
    model: "gemini-2.5-flash",
    temperature: 0.2,
    systemInstruction: "Optimized prompt instructions",
    sitePlanPromptContract: "Contract",
    pageCopyPromptContract: "Copy Contract",
    maxOutputTokens: 4096,
    publishedAt: new Date().toISOString(),
    evaluatedArchetypes: [],
  };
  promptRegistry.registerPromptVersion(canary);
  promptRegistry.pinJobPrompt("job_p8_canary", "1.1.0-canary");
  assert(promptRegistry.getJobPinnedVersion("job_p8_canary").version === "1.1.0-canary", "Job pins canary prompt version");

  // Rollback prompt
  promptRegistry.rollbackToVersion("1.0.0", "Automated canary rollback verification", "usr_admin_1");
  assert(promptRegistry.getActivePromptVersion().version === "1.0.0", "Prompt rolled back to 1.0.0 cleanly");

  // Quality evaluation harness across all 6 archetypes
  const evalReport = await evaluationHarness.evaluatePromptVersion("1.0.0");
  assert(evalReport.allPassed, "AI quality evaluation benchmark passed across all 6 business archetypes");
  assert(evalReport.archetypesTested === 6, "Evaluated Tourism, Law Firm, Bakery, Trades, Retail, and Healthcare");
  console.log("  ✓ [PASS] Pinned prompt versioning, canary rollback, and 6-archetype benchmark verified");

  // -------------------------------------------------------------------------
  // Gate 8: Terms Acceptance & Policy Versioning (FR-090, TDD §28.1, §36.1)
  // -------------------------------------------------------------------------
  console.log("\n--- Gate 8: Terms Acceptance & Plain Disclosures (FR-090) ---");
  const testUserId = "usr_p8_legal_test";
  const acceptances = policyService.recordConsent(testUserId, ["tos", "privacy", "aup"], {
    ipAddress: "197.237.100.1",
    userAgent: "Mozilla/5.0 Chrome/128.0",
  });
  assert(acceptances.length === 3, "Customer accepted ToS, Privacy Notice, and AUP");
  assert(policyService.verifyCompliance(testUserId).compliant, "Customer is legally compliant");

  const checkoutDisclosure = policyService.getCheckoutDisclosure("Starter", "monthly", 1900, "USD");
  assert(checkoutDisclosure.includes("automatically renew"), "Checkout disclosure states auto-renewal");
  assert(checkoutDisclosure.includes("USD 19.00"), "Checkout disclosure states exact price");

  const domainDisclosure = policyService.getDomainDisclosure("mara.ke", 1, 1499, 1499);
  assert(domainDisclosure.includes("legal registrant"), "Domain disclosure names customer as legal registrant");
  assert(domainDisclosure.includes("EPP transfer auth codes"), "Domain disclosure guarantees unhindered transfer");
  console.log("  ✓ [PASS] Customer acceptance ledger and plain renewal/domain disclosures verified");

  // -------------------------------------------------------------------------
  // Gate 9: Adaptive Rate Limiting & Security Defenses (TDD §31.1, §34.1)
  // -------------------------------------------------------------------------
  console.log("\n--- Gate 9: Adaptive Rate Limiting & Edge Security Defenses ---");
  const testIp = "172.16.0.45";
  for (let i = 0; i < 5; i++) {
    assert(rateLimiter.checkAuth(testIp).allowed, `Attempt ${i + 1} permitted`);
  }
  const blockedAttempt = rateLimiter.checkAuth(testIp);
  assert(!blockedAttempt.allowed, "6th rapid login attempt blocked by sliding window rate limiter");
  assert(blockedAttempt.resetSeconds > 0, "Rate limiter returns positive Retry-After seconds");

  const edgeReq = new NextRequest("http://localhost:3000/dashboard");
  const edgeRes = middleware(edgeReq);
  assert(edgeRes.headers.get("Content-Security-Policy") !== null, "CSP header injected");
  assert(edgeRes.headers.get("X-Frame-Options") === "SAMEORIGIN", "Anti-clickjacking SAMEORIGIN header injected");
  assert(edgeRes.headers.get("X-Content-Type-Options") === "nosniff", "nosniff header injected");
  assert(edgeRes.headers.get("Strict-Transport-Security") !== null, "HSTS header injected");
  console.log("  ✓ [PASS] Rate limiting shield rejects brute force; edge middleware injects defensive headers");

  // -------------------------------------------------------------------------
  // Gate 10: WCAG 2.1 AA Accessibility & Performance Benchmarks (TDD §31.1)
  // -------------------------------------------------------------------------
  console.log("\n--- Gate 10: WCAG 2.1 AA Accessibility & Core Web Vitals ---");
  assert(allManifests.length >= 20, "All 20 section manifests catalogued");

  // Theme contrast ratios >= 4.5:1
  const theme = defaultThemes["warm-editorial"];
  const contrastRatio = calculateContrastRatio(theme.tokens.colors.text, theme.tokens.colors.background);
  assert(contrastRatio >= 4.5, `Theme text contrast ratio is ${contrastRatio}:1 (>= 4.5:1 required)`);

  // Compiled static output budget constraints
  const compiled = compileSiteHtml(maraHorizonConfig);
  const homeFile = compiled.files.find((f) => f.path === "index.html")!;
  const homeHtmlSize = (Buffer.isBuffer(homeFile.content) ? homeFile.content.length : Buffer.byteLength(homeFile.content, "utf-8")) / 1024;
  assert(homeHtmlSize < 50, `Homepage HTML size (${Math.round(homeHtmlSize)}KB) is well within 50KB budget`);

  const cssFile = compiled.files.find((f) => f.path === "assets/style.css")!;
  const cssSize = (Buffer.isBuffer(cssFile.content) ? cssFile.content.length : Buffer.byteLength(cssFile.content, "utf-8")) / 1024;
  assert(cssSize < 30, `Stylesheet size (${Math.round(cssSize)}KB) is well within 30KB budget`);

  const css = typeof cssFile.content === "string" ? cssFile.content : cssFile.content.toString("utf-8");
  assert(css.includes("@media (prefers-reduced-motion: reduce)"), "CSS includes reduced motion query");
  assert(css.includes("@media (max-width: 768px)"), "CSS includes mobile responsive media query");
  console.log("  ✓ [PASS] WCAG 2.1 AA contrast verified, reduced motion active, payload budgets strictly satisfied");

  console.log("\n===============================================================================");
  console.log("  🎉 ALL 10 PHASE 8 ACCEPTANCE GATES PASSED (100%)");
  console.log("  Production Hardening, Launch Readiness, Backup DR, Observability,");
  console.log("  RBAC Admin Console, Prompt Registry & Legal Compliance are verified!");
  console.log("===============================================================================\n");
}

runPhase8Verification().catch((err) => {
  console.error("\n❌ PHASE 8 VERIFICATION FAILED:", err);
  process.exit(1);
});
