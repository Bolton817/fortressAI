import { notFound } from "next/navigation";
import { Metadata } from "next";
import { tenantRepository } from "@/db/tenant-repository";
import { releaseRepository } from "@/db/release-repository";
import { domainRepository } from "@/db/domain-repository";
import { seedPhase0Tenants } from "@/db/seed-data";
import { SiteRenderer } from "@/renderer/site-renderer";
import { SeoGenerator } from "@/core/publish/seo-generator";
import { Construction } from "lucide-react";

export const dynamic = "force-dynamic";

interface PublicSitePageProps {
  params: Promise<{ siteSlug: string; slug?: string[] }>;
}

async function resolveSiteAndRelease(siteSlug: string) {
  seedPhase0Tenants();

  // 1. Try resolving by platform slug
  let site = tenantRepository.getSiteBySlug(siteSlug);

  // 2. Try resolving by custom domain or domain mapping
  if (!site) {
    const resolved = domainRepository.resolveSiteIdFromHostname(siteSlug);
    if (resolved) {
      site = tenantRepository.getSiteDirect(resolved.siteId);
    }
  }

  // 3. Fallback: try direct site ID
  if (!site) {
    site = tenantRepository.getSiteDirect(siteSlug);
  }

  if (!site || site.lifecycleStatus === "deleted") {
    return null;
  }

  // Invariant (TDD §7.1, FR-034): Public route renders ONLY published release
  if (!site.publishedReleaseId) {
    return { site, release: null };
  }

  const release = releaseRepository.getRelease(site.publishedReleaseId);
  return { site, release };
}

export async function generateMetadata({ params }: PublicSitePageProps): Promise<Metadata> {
  const { siteSlug, slug } = await params;
  const data = await resolveSiteAndRelease(siteSlug);
  if (!data || !data.release) {
    return {
      title: "Not Found",
      robots: { index: false, follow: false },
    };
  }

  const { site, release } = data;
  const currentPath = slug && slug.length > 0 ? slug.join("/") : "home";
  const seoSnapshot = release.seoMetadataSnapshot || {};
  const pageSeo = seoSnapshot[currentPath] || seoSnapshot["home"] || {
    title: `${site.name} | Official Website`,
    description: `Official website of ${site.name}.`,
    canonicalUrl: `https://${site.platformSlug}.fortressai.app`,
  };

  return {
    title: pageSeo.title,
    description: pageSeo.description,
    alternates: {
      canonical: pageSeo.canonicalUrl,
    },
    openGraph: {
      title: pageSeo.ogTitle || pageSeo.title,
      description: pageSeo.ogDescription || pageSeo.description,
      images: pageSeo.ogImage ? [{ url: pageSeo.ogImage }] : undefined,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function PublicSitePage({ params }: PublicSitePageProps) {
  const { siteSlug, slug } = await params;
  const data = await resolveSiteAndRelease(siteSlug);

  if (!data) {
    notFound();
  }

  const { site, release } = data;

  // If site is not published yet, display friendly under-construction page (never leak draft!)
  if (!release) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 text-zinc-900 font-sans">
        <div className="max-w-md w-full bg-white border border-zinc-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
            <Construction className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            {site.name} is Coming Soon
          </h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            This website is currently being prepared and has not been published yet. Please check back shortly!
          </p>
        </div>
      </div>
    );
  }

  const currentSlug = slug && slug.length > 0 ? `/${slug.join("/")}` : "/";
  const matchingPage =
    release.config.pages.find((p) => p.slug === (slug ? slug.join("/") : "home")) ||
    release.config.pages[0];

  const structuredData = matchingPage
    ? SeoGenerator.generateStructuredData(
        release.config,
        matchingPage,
        `https://${site.platformSlug}.fortressai.app`
      )
    : null;

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <SiteRenderer
        config={release.config}
        currentSlug={currentSlug}
        linkPrefix={`/site/${site.platformSlug}`}
      />
    </>
  );
}
