import { NextResponse } from "next/server";
import { requireSiteOwnership } from "@/core/auth/auth-guard";
import { RollbackService } from "@/core/publish/rollback-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const { user } = await requireSiteOwnership(request, siteId);
    const body = await request.json();

    if (!body?.targetReleaseId) {
      return NextResponse.json(
        { error: "Target release ID is required for rollback" },
        { status: 400 }
      );
    }

    const result = await RollbackService.rollbackSite(
      siteId,
      body.targetReleaseId,
      user.id
    );

    return NextResponse.json({
      success: true,
      restoredRelease: result.restoredRelease,
      fromReleaseId: result.fromReleaseId,
      durationMs: result.durationMs,
    });
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err.statusCode === 403 || err.name === "TenantAccessDeniedError") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to rollback release" },
      { status: err.statusCode || 400 }
    );
  }
}
