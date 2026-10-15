import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { userRepository } from "@/db/user-repository";
import { tenantRepository } from "@/db/tenant-repository";
import { requireAuth, requireSiteOwnership } from "@/core/auth/auth-guard";
import { sessionManager } from "@/core/auth/session-manager";
import { maraHorizonConfig, nairobiAdvisoryConfig } from "@/db/seed-data";
import { TenantAccessDeniedError, UnauthorizedError } from "@/core/errors";

describe("Phase 3: Multi-Tenant Authorisation & Security Boundaries (TDD §7, FR-009, FR-014)", () => {
  let tenantA: any;
  let tenantB: any;
  let siteA: any;
  let siteB: any;

  beforeEach(async () => {
    userRepository.clearAll();

    tenantA = userRepository.createUser({
      email: "tenantA@safaris.com",
      displayName: "Tenant A Operator",
      status: "active",
    });

    tenantB = userRepository.createUser({
      email: "tenantB@consulting.com",
      displayName: "Tenant B Advisory",
      status: "active",
    });

    const runId = Math.random().toString(36).substring(7);
    siteA = await tenantRepository.createSite(
      tenantA.id,
      "Mara Expeditions",
      `mara-expeditions-${runId}`,
      maraHorizonConfig
    );

    siteB = await tenantRepository.createSite(
      tenantB.id,
      "Apex Advisory",
      `apex-advisory-${runId}`,
      nairobiAdvisoryConfig
    );
  });

  afterEach(() => {
    if (siteA) tenantRepository.deleteSitePermanently(siteA.id);
    if (siteB) tenantRepository.deleteSitePermanently(siteB.id);
  });

  it("lists only sites belonging to the requesting user", async () => {
    const sitesA = await tenantRepository.listSitesForUser(tenantA.id);
    expect(sitesA.length).toBe(1);
    expect(sitesA[0].id).toBe(siteA.id);

    const sitesB = await tenantRepository.listSitesForUser(tenantB.id);
    expect(sitesB.length).toBe(1);
    expect(sitesB[0].id).toBe(siteB.id);
  });

  it("rejects unauthenticated requests at the auth-guard boundary", async () => {
    const unauthReq = new Request("http://localhost/api/sites");
    await expect(requireAuth(unauthReq)).rejects.toThrow(UnauthorizedError);
  });

  it("allows a tenant to access their own site", async () => {
    const { sessionToken } = sessionManager.createSession(tenantA.id);
    const authReq = new Request("http://localhost/api/sites/" + siteA.id, {
      headers: { cookie: `fortress_session=${sessionToken}` },
    });

    const result = await requireSiteOwnership(authReq, siteA.id);
    expect(result.site.id).toBe(siteA.id);
    expect(result.user.id).toBe(tenantA.id);
  });

  it("strictly blocks cross-tenant reads (Tenant B cannot read Tenant A's site)", async () => {
    const { sessionToken } = sessionManager.createSession(tenantB.id);
    const crossReq = new Request("http://localhost/api/sites/" + siteA.id, {
      headers: { cookie: `fortress_session=${sessionToken}` },
    });

    await expect(requireSiteOwnership(crossReq, siteA.id)).rejects.toThrow(TenantAccessDeniedError);
  });

  it("strictly blocks cross-tenant mutations (Tenant B cannot mutate Tenant A's draft)", async () => {
    await expect(
      tenantRepository.saveRevision(
        { userId: tenantB.id },
        siteA.id,
        maraHorizonConfig,
        "Adversarial mutation"
      )
    ).rejects.toThrow(TenantAccessDeniedError);
  });

  it("strictly blocks cross-tenant deletion (Tenant B cannot delete Tenant A's site)", async () => {
    await expect(
      tenantRepository.deleteSite({ userId: tenantB.id }, siteA.id)
    ).rejects.toThrow(TenantAccessDeniedError);
  });
});
