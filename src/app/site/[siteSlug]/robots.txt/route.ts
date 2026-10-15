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
    return new NextResponse("User-agent: *\nDisallow: /\n", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const host = request.headers.get("host") || `${site.platformSlug}.fortressai.app`;
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const release = releaseRepository.getRelease(site.publishedReleaseId);
  const robots = release?.robotsTxt || SeoGenerator.generateRobotsTxt(baseUrl);

  return new NextResponse(robots, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
