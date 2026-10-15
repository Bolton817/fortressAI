import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/auth-guard";
import { tenantRepository } from "@/db/tenant-repository";
import { notificationRepository } from "@/db/notification-repository";
import { auditRepository } from "@/db/audit-repository";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);

    // Fetch user's owned sites
    const sites = await tenantRepository.listSitesForUser(user.id);

    // Fetch configurations for each site
    const fullSites = [];
    for (const site of sites) {
      try {
        const config = await tenantRepository.getDraftConfiguration({ userId: user.id }, site.id);
        fullSites.push({
          site,
          configuration: config,
        });
      } catch {
        fullSites.push({ site });
      }
    }

    // Fetch notifications
    const notifications = notificationRepository.findForUser(user.id);

    // Fetch audit history
    const auditLogs = auditRepository.findByActor(user.id);

    const exportBundle = {
      exportVersion: "1.0",
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.emailNormalised,
        displayName: user.displayName,
        phoneOptional: user.phoneOptional,
        timezone: user.timezone,
        status: user.status,
        emailVerifiedAt: user.emailVerifiedAt,
        termsAcceptedAt: user.termsAcceptedAt,
        policyVersion: user.policyVersion,
        createdAt: user.createdAt,
      },
      sites: fullSites,
      notifications,
      auditLogs,
    };

    auditRepository.record({
      actorUserId: user.id,
      action: "user.data_exported",
      targetType: "user",
      targetId: user.id,
    });

    return NextResponse.json(exportBundle, {
      headers: {
        "Content-Disposition": `attachment; filename="fortress-account-export-${user.id}.json"`,
      },
    });
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to export account data" }, { status: 500 });
  }
}
