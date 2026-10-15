import { NextResponse } from "next/server";
import { tenantRepository } from "@/db/tenant-repository";
import { releaseRepository } from "@/db/release-repository";
import { SeoGenerator } from "@/core/publish/seo-generator";

interface RouteProps {
  params: Promise<{ siteSlug: string }>;
}

export async function GET(request: Request, { params }: RouteProps) {
  const { siteSlug } = await params;
  const site = tenantRepository.getSiteBySlug(siteSlug) || tenantRepository.getSiteDirect(siteSlug);

  if (!site || !site.publishedReleaseId) {
    return new NextResponse("Sitemap not found or site unpublished", { status: 404 });
  }

  const release = releaseRepository.getRelease(site.publishedReleaseId);
  if (!release) {
    return new NextResponse("Release not found", { status: 404 });
  }

  const host = request.headers.get("host") || `${site.platformSlug}.fortressai.app`;
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const xml = release.sitemapXml || SeoGenerator.generateSitemapXml(release.config, baseUrl);

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
