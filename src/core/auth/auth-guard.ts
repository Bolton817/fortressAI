import { sessionManager } from "./session-manager";
import { userRepository, UserRecord } from "@/db/user-repository";
import { tenantRepository, StoredSite } from "@/db/tenant-repository";
import { UnauthorizedError, TenantAccessDeniedError } from "@/core/errors";

/**
 * Fortress AI — Authentication & Tenant Authorisation Guard (TDD §7.2, §23.3, FR-009)
 * Server-side route helper enforcing authentication and resource membership.
 */

export async function getCurrentUser(request: Request): Promise<UserRecord | null> {
  const session = sessionManager.getSessionFromRequest(request);
  if (!session) return null;

  const user = userRepository.findById(session.userId);
  if (!user || user.status === "suspended" || user.status === "deleted") {
    return null;
  }
  return user;
}

export async function requireAuth(request: Request): Promise<UserRecord> {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new UnauthorizedError("Authentication required to access this resource.");
  }
  return user;
}

export async function requireSiteOwnership(
  request: Request,
  siteId: string
): Promise<{ user: UserRecord; site: StoredSite }> {
  const user = await requireAuth(request);

  try {
    const site = await tenantRepository.getSite({ userId: user.id }, siteId);
    return { user, site };
  } catch (err: any) {
    if (err instanceof TenantAccessDeniedError) {
      throw err;
    }
    throw new TenantAccessDeniedError(`User '${user.id}' is not authorized to access site '${siteId}'.`);
  }
}
