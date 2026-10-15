/**
 * Fortress AI — Role-Based Access Control (RBAC) Guard (TDD §32.4, FR-087)
 * Defines role boundaries and enforces least privilege:
 * - Admin: Full operations; requires reason for writes.
 * - Support: Diagnostic access; strictly blocked from secrets & raw credentials.
 * - Curator: Themes and section manifests; strictly blocked from billing & finances.
 * - Tenant: Scoped strictly to owned sites and account resources.
 */

export type UserRole = "admin" | "support" | "curator" | "tenant";

export class UnauthorizedRoleError extends Error {
  constructor(role: string, action: string) {
    super(`Role "${role}" is not authorized to perform action "${action}" (FR-087).`);
    this.name = "UnauthorizedRoleError";
  }
}

export class RbacGuard {
  /**
   * Asserts that acting role is one of the allowed roles
   */
  public static assertRole(
    currentRole: UserRole,
    allowedRoles: UserRole[],
    action: string = "perform this operation"
  ): void {
    if (!allowedRoles.includes(currentRole)) {
      throw new UnauthorizedRoleError(currentRole, action);
    }
  }

  /**
   * Financial & Billing access check (Curator role is strictly denied)
   */
  public static assertBillingAccess(role: UserRole): void {
    if (role === "curator") {
      throw new UnauthorizedRoleError("curator", "access billing and financial records");
    }
    this.assertRole(role, ["admin", "support", "tenant"], "access billing");
  }

  /**
   * Secret & Credential access check (Support and Curator roles strictly denied)
   */
  public static assertSecretsAccess(role: UserRole): void {
    if (role === "support" || role === "curator" || role === "tenant") {
      throw new UnauthorizedRoleError(role, "view infrastructure secrets and provider credentials");
    }
    this.assertRole(role, ["admin"], "view secrets");
  }

  /**
   * Admin mutation check requiring a mandatory documented reason
   */
  public static assertAdminMutation(role: UserRole, reason?: string | null): void {
    this.assertRole(role, ["admin"], "execute administrative mutation");
    if (!reason || reason.trim().length === 0) {
      throw new Error("Admin mutations require a mandatory reason field (FR-087, TDD §32.4)");
    }
  }

  /**
   * Returns allowed diagnostic level for support role
   */
  public static sanitizeDiagnosticPayload<T extends Record<string, any>>(
    role: UserRole,
    data: T
  ): T {
    if (role === "admin") return data;

    // Support and other roles have all keys matching secret/key/token/password scrubbed
    const scrubbed: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      if (/secret|token|key|password|credential/i.test(k)) {
        scrubbed[k] = "[REDACTED_BY_RBAC]";
      } else {
        scrubbed[k] = v;
      }
    }
    return scrubbed as T;
  }
}
