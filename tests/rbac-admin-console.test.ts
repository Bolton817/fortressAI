import { describe, it, expect } from "vitest";
import { RbacGuard, UnauthorizedRoleError } from "@/core/auth/rbac-guard";
import { GET as adminOverviewRoute } from "@/app/api/admin/overview/route";
import { NextRequest } from "next/server";

describe("Phase 8: Production Hardening — RBAC & Admin Operations Console (TDD §32.4, §42.3, FR-087)", () => {
  describe("RbacGuard Policy Boundaries", () => {
    it("strictly blocks Curator role from accessing billing and financial records", () => {
      expect(() => RbacGuard.assertBillingAccess("curator")).toThrow(UnauthorizedRoleError);
      expect(() => RbacGuard.assertBillingAccess("admin")).not.toThrow();
      expect(() => RbacGuard.assertBillingAccess("support")).not.toThrow();
    });

    it("strictly blocks Support and Curator roles from viewing secrets and provider keys", () => {
      expect(() => RbacGuard.assertSecretsAccess("support")).toThrow(UnauthorizedRoleError);
      expect(() => RbacGuard.assertSecretsAccess("curator")).toThrow(UnauthorizedRoleError);
      expect(() => RbacGuard.assertSecretsAccess("tenant")).toThrow(UnauthorizedRoleError);
      expect(() => RbacGuard.assertSecretsAccess("admin")).not.toThrow();
    });

    it("requires a mandatory reason for administrative writes and mutations", () => {
      expect(() => RbacGuard.assertAdminMutation("admin", "")).toThrow(
        "Admin mutations require a mandatory reason field"
      );
      expect(() => RbacGuard.assertAdminMutation("admin", "   ")).toThrow(
        "Admin mutations require a mandatory reason field"
      );
      expect(() =>
        RbacGuard.assertAdminMutation("admin", "Manual rollback due to customer emergency")
      ).not.toThrow();
    });

    it("sanitizes sensitive secrets from diagnostics when role is support", () => {
      const sensitiveData = {
        siteId: "site_123",
        providerApiKey: "xkeysib-secret-key-12345",
        passwordHash: "$scrypt$hash",
        activeWorkers: 4,
      };

      const sanitized = RbacGuard.sanitizeDiagnosticPayload("support", sensitiveData);
      expect(sanitized.siteId).toBe("site_123");
      expect(sanitized.activeWorkers).toBe(4);
      expect(sanitized.providerApiKey).toBe("[REDACTED_BY_RBAC]");
      expect(sanitized.passwordHash).toBe("[REDACTED_BY_RBAC]");

      const adminView = RbacGuard.sanitizeDiagnosticPayload("admin", sensitiveData);
      expect(adminView.providerApiKey).toBe("xkeysib-secret-key-12345");
    });
  });

  describe("/api/admin/overview API Role Gating", () => {
    it("denies access to unauthorized roles with HTTP 403", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/overview", {
        headers: { "x-user-role": "curator" },
      });
      const res = await adminOverviewRoute(req);
      expect(res.status).toBe(403);
    });

    it("allows Support role to view operational telemetry", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/overview", {
        headers: { "x-user-role": "support" },
      });
      const res = await adminOverviewRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.callerRole).toBe("support");
      expect(json.panels.generationHealth).toBeDefined();
      expect(json.panels.publishingHealth).toBeDefined();
      expect(json.panels.domainOperations).toBeDefined();
      expect(json.panels.systemLatency).toBeDefined();
    });

    it("allows Admin role full access to operational panels and audit logs", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/overview", {
        headers: { "x-user-role": "admin" },
      });
      const res = await adminOverviewRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.callerRole).toBe("admin");
      expect(Array.isArray(json.panels.recentAuditLogs)).toBe(true);
    });
  });
});
