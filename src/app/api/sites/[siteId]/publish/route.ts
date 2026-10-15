import { NextResponse } from "next/server";
import { requireSiteOwnership } from "@/core/auth/auth-guard";
import { PublishOrchestrator } from "@/core/publish/publish-orchestrator";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const { user } = await requireSiteOwnership(request, siteId);
    const body = await request.json().catch(() => ({}));

    const result = await PublishOrchestrator.publishSite(
      siteId,
      user.id,
      body?.commitMessage
    );

    return NextResponse.json({
      success: true,
      release: result.release,
      publishedUrl: result.publishedUrl,
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
      { error: err.message || "Failed to publish site" },
      { status: err.statusCode || 400 }
    );
  }
}
