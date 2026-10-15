import { DomainValidator } from "../src/core/domains/domain-validator";
import { PricingCatalog } from "../src/core/domains/pricing-catalog";
import { RegistrarService } from "../src/core/domains/registrar-service";
import { KenyaRegistryAdapter } from "../src/core/domains/kenya-registry-adapter";
import { ChallengeGenerator } from "../src/core/domains/challenge-generator";
import { DnsVerifier } from "../src/core/domains/dns-verifier";
import { TlsChecker } from "../src/core/domains/tls-checker";
import { DomainOrchestrator } from "../src/core/domains/domain-orchestrator";
import { RenewalService } from "../src/core/domains/renewal-service";
import { TransferService } from "../src/core/domains/transfer-service";
import { DnsAdvisor } from "../src/core/domains/dns-advisor";
import { domainRepository } from "../src/db/domain-repository";
import { domainOrderRepository } from "../src/db/domain-order-repository";
import { notificationRepository } from "../src/db/notification-repository";
import { auditRepository } from "../src/db/audit-repository";
import { mockRegistrarAdapter } from "../src/core/domains/mock-registrar-adapter";
import { seedPhase0Tenants, USER_A_ID, SITE_A_ID, USER_B_ID, SITE_B_ID } from "../src/db/seed-data";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  ✗ [FAIL] ${msg}`);
    process.exit(1);
  }
  console.log(`  ✓ [PASS] ${msg}`);
}

async function runPhase5Verification() {
  console.log("===============================================================");
  console.log("  FORTRESS AI — PHASE 5 EXTERNAL DOMAINS & REGISTRAR VERIFICATION");
  console.log("  Evaluating against TDD §7.1, §22, §23, §36 Exit Criteria & Risk R-03");
  console.log("===============================================================\n");

  // Setup seed state and clean databases
  seedPhase0Tenants();
  domainRepository.clearAll();
  domainOrderRepository.clearAll();
  notificationRepository.clearAll();
  mockRegistrarAdapter.reset();
  DnsVerifier.clearMockDns();
  TlsChecker.clearMockTls();

  const siteId = SITE_A_ID;
  const ownerUserId = USER_A_ID;
  const otherSiteId = SITE_B_ID;
  const otherUserId = USER_B_ID;

  const validRegistrant = {
    firstName: "Mara",
    lastName: "Explorer",
    organization: "Mara Horizon Expeditions Ltd",
    email: "admin@marahorizon.co.ke",
    phone: "+254712345678",
    addressLine1: "Kenyatta Avenue, CBD",
    city: "Nairobi",
    postalCode: "00100",
    countryCode: "KE",
  };

  // 1. DOMAIN SYNTAX & COMPOUND TLD PARSING
  console.log("1. DOMAIN SYNTAX & RFC 1035 VALIDATION (TDD §22.3, FR-060, FR-062)");
  assert(DomainValidator.validate("valid-safaris.co.ke").isValid, "Validates compliant .co.ke domain syntax");
  assert(DomainValidator.validate("safaris.com").isValid, "Validates compliant .com domain syntax");
  assert(!DomainValidator.validate("-invalid.com").isValid, "Rejects domain starting with hyphen");
  assert(!DomainValidator.validate("invalid-.com").isValid, "Rejects domain ending with hyphen");
  assert(!DomainValidator.validate("localhost").isValid, "Rejects platform reserved hostname 'localhost'");
  assert(!DomainValidator.validate("admin").isValid, "Rejects platform reserved hostname 'admin'");

  const parsedApex = DomainValidator.parse("mara-horizon.co.ke");
  assert(parsedApex.tld === "co.ke", "Accurately parses compound Kenyan TLD 'co.ke'");
  assert(parsedApex.isApex === true, "Identifies apex domain correctly");

  const parsedSub = DomainValidator.parse("tours.mara-horizon.co.ke");
  assert(parsedSub.subdomain === "tours", "Accurately extracts subdomain 'tours'");
  assert(parsedSub.isApex === false, "Identifies subdomain non-apex correctly");

  // 2. PRICING BOOK & AVAILABILITY SEARCH
  console.log("\n2. PRICING BOOK & AVAILABILITY SEARCH (TDD §22.3, FR-062)");
  const comPricing = PricingCatalog.getPricing("com");
  assert(comPricing?.firstTermPriceCents === 1499, "Discloses .com first-term price ($14.99)");
  assert(comPricing?.renewalPriceCents === 1499, "Discloses .com renewal price ($14.99)");

  const ckePricing = PricingCatalog.getPricing("co.ke");
  assert(ckePricing?.firstTermPriceCents === 1299, "Discloses .co.ke first-term price ($12.99 / KES 1,800)");
  assert(ckePricing?.requiresContactVerification === true, "Flags .co.ke contact verification requirement");

  const availableSearch = await RegistrarService.search("unregistered-camps.co.ke");
  assert(availableSearch.isAvailable === true, "Availability check returns available for unregistered domain");
  assert(availableSearch.supported === true, "Availability check confirms supported TLD");

  const takenSearch = await RegistrarService.search("google.com");
  assert(takenSearch.isAvailable === false, "Availability check returns unavailable for registered domain");

  const unsupportedSearch = await RegistrarService.search("test.fakeext99");
  assert(unsupportedSearch.supported === false, "Availability check rejects unsupported TLD");

  // 3. KENYA REGISTRY POLICY & RISK R-03 FALLBACK
  console.log("\n3. KENYA REGISTRY POLICY & RISK R-03 FALLBACK (TDD §22.3, §36, Risk R-03)");
  const kenyaAdapter = new KenyaRegistryAdapter(mockRegistrarAdapter, true);
  assert(KenyaRegistryAdapter.normalizeKenyanPhone("0712345678").isValid, "Normalizes Kenyan local 07XXXXXXXX phone to E.164");
  assert(KenyaRegistryAdapter.normalizeKenyanPhone("0712345678").normalized === "+254712345678", "E.164 phone output is +254712345678");
  assert(kenyaAdapter.validateKenyanRegistrant(validRegistrant, "co.ke").isValid, "Validates compliant KeNIC registrant details");

  // Test Risk R-03 assisted manual provisioning disclosure
  const restrictedAdapter = new KenyaRegistryAdapter(mockRegistrarAdapter, false);
  const restrictedSearch = await restrictedAdapter.checkAvailability({ domain: "safaris-resort.co.ke" });
  assert(restrictedSearch.requiresAssistedRegistration === true, "Risk R-03: Flags assisted manual registration when API automation is restricted");
  assert(restrictedSearch.policyNotes?.includes("Risk R-03") === true, "Risk R-03: Discloses policy notes to tenant without silent failure");

  const restrictedReg = await restrictedAdapter.registerDomain(
    {
      domain: "safaris-resort.co.ke",
      termYears: 1,
      registrant: validRegistrant,
    },
    "idemp_r03_verify_001"
  );
  assert(restrictedReg.isAssistedRegistration === true, "Risk R-03: Queues assisted registration order with partner SLA");

  // 4. CRYPTOGRAPHIC DNS CHALLENGE & OWNERSHIP VERIFICATION
  console.log("\n4. CRYPTOGRAPHIC DNS CHALLENGE & VERIFICATION (TDD §22.4, §22.5, FR-061)");
  const challenge = ChallengeGenerator.generate("acme-safaris.co.ke", "custom_apex");
  assert(challenge.token.length === 64, "Generated 32-byte CSPRNG token (64 hex chars)");
  assert(challenge.challengeHost === "_fortress-challenge.acme-safaris.co.ke", "Generated formatted challenge TXT host");
  assert(challenge.challengeValue.startsWith("fortress-verification="), "Generated prefixed challenge TXT value");

  // Attach custom domain
  const attached = DomainOrchestrator.attachCustomDomain({
    siteId,
    userId: ownerUserId,
    rawHostname: "verify-test.co.ke",
  });
  assert(attached.verificationStatus === "pending", "Initial attached domain verification status is pending");

  // Invariant: Unpropagated DNS check remains pending
  const unverified = await DnsVerifier.verify("verify-test.co.ke");
  assert(unverified.success === false, "Unpropagated DNS check returns success: false");
  assert(unverified.status === "pending", "Unpropagated DNS check status remains pending");

  // Propagate DNS TXT record via mock resolver
  DnsVerifier.setMockTxtRecord(
    `_fortress-challenge.verify-test.co.ke`,
    [`fortress-verification=${attached.verificationToken}`]
  );

  const verified = await DnsVerifier.verify("verify-test.co.ke");
  assert(verified.success === true, "DNS verification passes when TXT record matches token");
  assert(verified.status === "verified", "Domain status transitioned to verified");

  // 5. DNS SETUP GUIDANCE & TLS READINESS ENGINE
  console.log("\n5. DNS SETUP GUIDANCE & TLS READINESS ENGINE (TDD §22.4, FR-064)");
  const records = DnsAdvisor.getRecordsForDomain(attached);
  assert(records.some((r) => r.type === "TXT"), "DNS advisor includes TXT verification record");
  assert(records.some((r) => r.type === "A"), "DNS advisor includes A record for Apex routing");

  const cfGuide = DnsAdvisor.getProviderGuide("cloudflare");
  assert(cfGuide.providerName === "Cloudflare", "DNS advisor returns Cloudflare step-by-step guide");
  assert(cfGuide.steps.length >= 4, "DNS guide provides comprehensive instructions");

  // Invariant: TLS certificate check requires verified DNS
  DomainOrchestrator.attachCustomDomain({
    siteId,
    userId: ownerUserId,
    rawHostname: "tls-test.co.ke",
  });
  const tlsPending = await TlsChecker.check("tls-test.co.ke");
  assert(tlsPending.success === false, "TLS check returns success: false prior to DNS verification");
  assert(tlsPending.status === "pending", "TLS status is pending prior to DNS verification");

  // Update DNS to verified, then test TLS
  domainRepository.updateDnsStatus("tls-test.co.ke", "verified");
  const tlsActive = await TlsChecker.check("tls-test.co.ke");
  assert(tlsActive.success === true, "TLS check returns success: true after DNS verification");
  assert(tlsActive.status === "active", "TLS status transitions to active");

  // 6. ANTI-TAKEOVER MULTI-TENANT BOUNDARY
  console.log("\n6. ANTI-TAKEOVER MULTI-TENANT BOUNDARY (TDD §7.1, §22.5, FR-061)");
  let takeoverBlocked = false;
  try {
    DomainOrchestrator.attachCustomDomain({
      siteId: otherSiteId,
      userId: otherUserId,
      rawHostname: "verify-test.co.ke", // Domain claimed by Tenant A
    });
  } catch (err: any) {
    takeoverBlocked = true;
  }
  assert(takeoverBlocked, "Anti-takeover guard strictly rejects cross-tenant domain claiming");

  // Fast resolution from HTTP host header
  const resolved = domainRepository.resolveSiteIdFromHostname("verify-test.co.ke");
  assert(resolved?.siteId === siteId, "HTTP Host resolution resolves verified domain to correct site ID");

  // 7. IDEMPOTENT REGISTRATION & RECEIPT TRACKING
  console.log("\n7. IDEMPOTENT REGISTRATION & RECEIPT TRACKING (TDD §22.2, FR-063)");
  const idempotencyKey = "idemp_verify_script_001";

  const reg1 = await DomainOrchestrator.registerAndAttachDomain({
    siteId,
    userId: ownerUserId,
    domain: "mara-safaris-wildlife.com",
    termYears: 1,
    registrant: validRegistrant,
    idempotencyKey,
  });

  assert(reg1.registration.success === true, "First domain registration succeeds");
  assert(reg1.order.orderStatus === "completed", "DomainOrder status is completed");
  assert(reg1.order.receiptJson?.invoiceNumber !== undefined, "Persistent order receipt contains invoice number");

  // Duplicate registration with same key
  const reg2 = await DomainOrchestrator.registerAndAttachDomain({
    siteId,
    userId: ownerUserId,
    domain: "mara-safaris-wildlife.com",
    termYears: 1,
    registrant: validRegistrant,
    idempotencyKey,
  });

  assert(reg1.order.id === reg2.order.id, "Idempotent retry yields identical DomainOrder ID without duplicate execution");
  assert(domainOrderRepository.listOrdersForSite(siteId).length === 1, "Only 1 order persisted in database");

  // 8. RENEWAL MILESTONES & DEDUPLICATED REMINDERS
  console.log("\n8. RENEWAL MILESTONES & REMINDERS (TDD §22.1, FR-065)");
  const regForRenewal = await DomainOrchestrator.registerAndAttachDomain({
    siteId,
    userId: ownerUserId,
    domain: "expiring-mara.co.ke",
    termYears: 1,
    registrant: validRegistrant,
    idempotencyKey: "idemp_reg_for_renewal_001",
  });

  const expiryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days from now
  const renewalOrder = domainOrderRepository.updateOrderStatus(regForRenewal.order.id, {
    orderStatus: "completed",
    expiresAt: expiryDate.toISOString(),
  });

  const renewalEval1 = RenewalService.evaluateOrder(renewalOrder);
  assert(renewalEval1.reminderDispatched === true, "Dispatches reminder when domain enters 14-day renewal window");
  assert(renewalEval1.milestone === 14, "Identifies 14-day renewal milestone accurately");

  // Re-evaluation deduplication check
  const renewalEval2 = RenewalService.evaluateOrder(renewalOrder);
  assert(renewalEval2.reminderDispatched === true, "Re-evaluation acknowledges milestone");
  const notifications = notificationRepository.getNotificationsForUser(ownerUserId);
  const renewalNotifs = notifications.filter((n) => n.title.includes("Domain Renewal Due"));
  assert(renewalNotifs.length === 1, "Deduplication guard strictly prevents duplicate reminder spam");

  // Execute renewal
  const renewOp = await RenewalService.executeRenewal(renewalOrder.id, 1, "idemp_renew_script_001");
  assert(renewOp.success === true, "Renewal execution succeeds");
  const updatedOrder = domainOrderRepository.getOrderById(renewalOrder.id);
  assert(updatedOrder?.expiresAt === renewOp.newExpiresAt, "DomainOrder expiration extended by 1 year");

  // 9. ZERO DARK PATTERNS PORTABILITY & TRANSFER
  console.log("\n9. ZERO DARK PATTERNS PORTABILITY & TRANSFER (TDD §22.3, FR-066)");
  const transferDetails = await TransferService.getTransferDetails(siteId, ownerUserId, "mara-safaris-wildlife.com");
  assert(transferDetails.domain === "mara-safaris-wildlife.com", "Returns transfer details for owned domain");
  assert(transferDetails.authCode.startsWith("EPP-"), "Returns valid registrar EPP Authorization code");
  assert(transferDetails.isLocked === true, "Default domain transfer lock is enabled");
  assert(transferDetails.policyNotes.includes("does NOT delete your website"), "Discloses zero dark patterns portability guarantee");

  // Toggle lock
  const unlocked = await TransferService.setLockStatus(siteId, ownerUserId, "mara-safaris-wildlife.com", false);
  assert(unlocked === false, "Successfully toggled domain lock to UNLOCKED");

  // Initiate transfer
  const transferResult = await TransferService.requestTransferOut(
    siteId,
    ownerUserId,
    "mara-safaris-wildlife.com",
    transferDetails.authCode
  );
  assert(transferResult.success === true, "Transfer request successfully initiated");
  assert(transferResult.status === "initiated", "Transfer status set to initiated");

  // Audit event check
  const transferAudit = auditRepository.listEvents({ targetId: "mara-safaris-wildlife.com" });
  assert(transferAudit.some((e) => e.action === "domain.transfer_requested"), "Recorded non-repudiable domain.transfer_requested audit event");

  console.log("\n===============================================================");
  console.log("  RESULT: ALL PHASE 5 VERIFICATION CHECKS PASSED (100%)");
  console.log("  External Domains & Registrar Integration compliant with TDD v1.0.");
  console.log("===============================================================\n");
}

runPhase5Verification().catch((err) => {
  console.error("Verification failed with uncaught exception:", err);
  process.exit(1);
});
