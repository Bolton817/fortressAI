import { NextResponse } from "next/server";
import { requireSiteOwnership } from "@/core/auth/auth-guard";
import { releaseRepository } from "@/db/release-repository";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const { site } = await requireSiteOwnership(request, siteId);

    const releases = releaseRepository.listReleasesForSite(siteId);

    const formatted = releases.map((rel) => ({
      ...rel,
      isActive: rel.id === site.publishedReleaseId,
    }));

    return NextResponse.json({
      success: true,
      activeReleaseId: site.publishedReleaseId || null,
      releases: formatted,
    });
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err.statusCode === 403 || err.name === "TenantAccessDeniedError") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to list releases" },
      { status: 500 }
    );
  }
}
