import { describe, it, expect, beforeEach } from "vitest";
import { scanFilesForSecrets, ExportSecurityViolationError } from "@/core/export/secret-scanner";
import { generateDownloadToken, verifyDownloadToken } from "@/core/export/export-tokens";
import { exportService } from "@/core/export/export-service";
import { entitlementService, FeatureNotEntitledError } from "@/core/billing/entitlement-service";
import { subscriptionRepository } from "@/db/subscription-repository";
import { tenantRepository } from "@/db/tenant-repository";
import { seedPhase0Tenants, USER_A_ID, USER_B_ID, SITE_A_ID, SITE_B_ID } from "@/db/seed-data";

describe("Phase 7: Export Security, Tenant Isolation & Token Delivery (TDD §21.5, §29.3, FR-082)", () => {
  beforeEach(async () => {
    seedPhase0Tenants();
    subscriptionRepository.clearAll();
  });

  it("enforces tenant isolation: User A cannot export User B's site", async () => {
    // Attempting to export User B's site using User A credentials
    await expect(
      exportService.compileSitePackage(USER_A_ID, SITE_B_ID)
    ).rejects.toThrow();
  });

  it("blocks free tier accounts without export entitlements and permits paid subscriptions", async () => {
    // User A has no active subscription -> defaults to Free Trial
    await expect(
      exportService.compileSitePackage(USER_A_ID, SITE_A_ID)
    ).rejects.toThrow(FeatureNotEntitledError);

    // Give User A an active Starter subscription
    subscriptionRepository.createSubscription({
      userId: USER_A_ID,
      planId: "starter",
      billingInterval: "monthly",
      currency: "USD",
    });

    // Now export check passes
    const result = await exportService.compileSitePackage(USER_A_ID, SITE_A_ID);
    expect(result.exportId).toBeDefined();
    expect(result.sha256).toHaveLength(64);
  });

  it("secret scanner aborts export when database connection strings or API keys are detected", () => {
    const cleanFiles = [
      { path: "index.html", content: "<h1>Welcome</h1>" },
      { path: "assets/style.css", content: "body { margin: 0; }" },
    ];
    expect(scanFilesForSecrets(cleanFiles).passed).toBe(true);

    // Test database URI leak
    const dirtyFilesDb = [
      ...cleanFiles,
      { path: "config.js", content: "const db = 'postgresql://admin:supersecret123@db.prod.internal:5432/main';" },
    ];
    expect(() => scanFilesForSecrets(dirtyFilesDb)).toThrow(ExportSecurityViolationError);

    // Test provider API key leak (joined to prevent GitHub push protection false positive)
    const dummyProviderKey = ["sk", "live", "abcdef1234567890abcdef1234567890"].join("_");
    const dirtyFilesKey = [
      ...cleanFiles,
      { path: "app.js", content: `const key = '${dummyProviderKey}';` },
    ];
    expect(() => scanFilesForSecrets(dirtyFilesKey)).toThrow(ExportSecurityViolationError);

    // Test IntaSend secret key leak
    const dirtyFilesIntasend = [
      ...cleanFiles,
      { path: "env.txt", content: "INTASEND_SECRET_KEY=ISSecretKey_live_998877665544332211" },
    ];
    expect(() => scanFilesForSecrets(dirtyFilesIntasend)).toThrow(ExportSecurityViolationError);
  });

  it("generates and verifies HMAC-signed download tokens with strict expiration and tampering defense", () => {
    const payload = {
      siteId: "site_test_123",
      userId: "usr_test_abc",
      exportId: "exp_test_999",
    };

    // 1. Valid token
    const token = generateDownloadToken(payload, 60000); // 1 minute
    const verified = verifyDownloadToken(token);
    expect(verified.valid).toBe(true);
    expect(verified.payload?.siteId).toBe(payload.siteId);
    expect(verified.payload?.userId).toBe(payload.userId);

    // 2. Expired token (negative TTL)
    const expiredToken = generateDownloadToken(payload, -5000);
    const verifiedExpired = verifyDownloadToken(expiredToken);
    expect(verifiedExpired.valid).toBe(false);
    expect(verifiedExpired.reason).toBe("Token has expired");

    // 3. Tampered payload
    const parts = token.split(".");
    const tamperedPayloadB64 = Buffer.from(
      JSON.stringify({ ...payload, siteId: "site_hacked_attacker" })
    ).toString("base64url");
    const tamperedToken = `${tamperedPayloadB64}.${parts[1]}`;

    const verifiedTampered = verifyDownloadToken(tamperedToken);
    expect(verifiedTampered.valid).toBe(false);
    expect(verifiedTampered.reason).toBe("Invalid token signature");
  });
});
