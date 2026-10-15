import { NextResponse } from "next/server";
import { requireSiteOwnership } from "@/core/auth/auth-guard";
import { tenantRepository } from "@/db/tenant-repository";
import { auditRepository } from "@/db/audit-repository";
import { SiteConfigurationSchema } from "@/core/schema/site-config";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const { user, site } = await requireSiteOwnership(request, siteId);

    let draftConfig = null;
    try {
      draftConfig = await tenantRepository.getDraftConfiguration({ userId: user.id }, siteId);
    } catch {}

    return NextResponse.json({
      success: true,
      site,
      configuration: draftConfig,
    });
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err.statusCode === 403 || err.name === "TenantAccessDeniedError") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Site not found" }, { status: 404 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const { user, site } = await requireSiteOwnership(request, siteId);
    const body = await request.json();

    if (body.configuration) {
      const validated = SiteConfigurationSchema.parse(body.configuration);
      const rev = await tenantRepository.saveRevision(
        { userId: user.id },
        siteId,
        validated,
        body.reason || "Manual update"
      );

      auditRepository.record({
        actorUserId: user.id,
        action: "site.update_configuration",
        targetType: "site",
        targetId: siteId,
        metadataJson: { revisionId: rev.id, version: rev.version },
      });

      return NextResponse.json({
        success: true,
        revision: rev,
      });
    }

    return NextResponse.json({ success: true, site });
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err.statusCode === 403 || err.name === "TenantAccessDeniedError") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to update site" }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const { user } = await requireSiteOwnership(request, siteId);

    await tenantRepository.deleteSite({ userId: user.id }, siteId);

    auditRepository.record({
      actorUserId: user.id,
      action: "site.delete",
      targetType: "site",
      targetId: siteId,
    });

    return NextResponse.json({
      success: true,
      message: "Site deleted successfully.",
    });
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err.statusCode === 403 || err.name === "TenantAccessDeniedError") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to delete site" }, { status: 400 });
  }
}
