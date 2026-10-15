import { NextResponse } from "next/server";
import { requireSiteOwnership } from "@/core/auth/auth-guard";
import { releaseRepository } from "@/db/release-repository";
import { domainRepository } from "@/db/domain-repository";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const { site } = await requireSiteOwnership(request, siteId);

    let activeRelease = null;
    if (site.publishedReleaseId) {
      activeRelease = releaseRepository.getRelease(site.publishedReleaseId);
    }

    const domains = domainRepository.listDomainsForSite(siteId);

    const platformUrl = `/site/${site.platformSlug}`;

    return NextResponse.json({
      success: true,
      siteId,
      lifecycleStatus: site.lifecycleStatus,
      publishedReleaseId: site.publishedReleaseId || null,
      activeRelease: activeRelease
        ? {
            id: activeRelease.id,
            releaseNumber: activeRelease.releaseNumber,
            commitMessage: activeRelease.commitMessage,
            createdAt: activeRelease.createdAt,
            artefactHash: activeRelease.artefactHash,
          }
        : null,
      platformUrl,
      domains,
      sitemapUrl: `${platformUrl}/sitemap.xml`,
      robotsUrl: `${platformUrl}/robots.txt`,
    });
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err.statusCode === 403 || err.name === "TenantAccessDeniedError") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to fetch publish status" },
      { status: 500 }
    );
  }
}
