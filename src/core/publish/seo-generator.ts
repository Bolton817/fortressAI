import { SiteConfiguration, PageRoute } from "@/core/schema/site-config";
import { SeoRouteMetadata } from "@/db/release-repository";

/**
 * Fortress AI — Deterministic SEO & Discovery Generator (TDD §16.5, FR-045, FR-046, FR-047)
 * Invariants:
 *  - 100% compliant XML sitemap format.
 *  - Zero invented reviews, ratings, or claims in Schema.org JSON-LD.
 *  - Previews have noindex; published releases have index, follow.
 */

export class SeoGenerator {
  /**
   * Extract business name safely from either businessProfile or businessBrief
   */
  public static getBusinessName(config: SiteConfiguration): string {
    const raw = config as any;
    const bp = raw.businessProfile || raw.businessBrief;
    return bp?.name || bp?.businessName || "Fortress Website";
  }

  /**
   * Generate route-level SEO metadata for all pages in a site configuration
   */
  public static generateAllMetadata(
    config: SiteConfiguration,
    baseUrl: string,
    isPublished: boolean = true
  ): Record<string, SeoRouteMetadata> {
    const rawConfig = config as any;
    const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
    const businessName = this.getBusinessName(config);
    const bp = (rawConfig.businessProfile || rawConfig.businessBrief || {}) as Record<string, any>;
    const result: Record<string, SeoRouteMetadata> = {};

    // Hero image binding fallback for social card
    const heroAsset = rawConfig.assetBindings?.find(
      (b: any) => b.slotId === "hero_image" || b.role === "content"
    );
    const defaultOgImage = heroAsset?.url || (heroAsset?.assetId
      ? `https://images.unsplash.com/photo-${heroAsset.assetId}?auto=format&fit=crop&w=1200&h=630&q=85`
      : undefined);

    const pages = config.pages || [];
    for (const page of pages) {
      const pageRoute = page.slug === "home" || page.slug === "/" ? "" : `/${page.slug.replace(/^\/+/, "")}`;
      const canonicalUrl = `${cleanBaseUrl}${pageRoute || "/"}`;

      const title =
        page.slug === "home" || page.slug === "/"
          ? `${businessName} | ${bp.tagline || bp.summary || "Official Website"}`
          : `${page.title} | ${businessName}`;

      const description =
        (page as any).description ||
        page.seo?.description ||
        bp.summary ||
        bp.tagline ||
        `Welcome to ${businessName}. Discover our premium services, tailored solutions, and professional excellence.`;

      const truncatedDesc =
        description.length > 160 ? `${description.slice(0, 157)}...` : description;

      const routeMeta: SeoRouteMetadata = {
        title: page.seo?.title || title,
        description: truncatedDesc,
        canonicalUrl,
        ogTitle: page.seo?.title || title,
        ogDescription: truncatedDesc,
        ogImage: defaultOgImage,
        noindex: !isPublished,
      };

      result[page.slug] = routeMeta;
      const stripped = page.slug.replace(/^\/+/, "");
      if (stripped) {
        result[stripped] = routeMeta;
      }
      if (page.slug === "/" || page.slug === "home" || stripped === "" || stripped === "home") {
        result["/"] = routeMeta;
        result["home"] = routeMeta;
      }
    }

    // Also include blog article routes if blog posts exist
    const blogPosts = (config as any).blogPosts || [];
    for (const post of blogPosts) {
      const postRoute = `/blog/${post.slug}`;
      const canonicalUrl = `${cleanBaseUrl}${postRoute}`;
      const title = `${post.title} | ${businessName}`;
      const description = post.excerpt || `${post.title} — Published by ${businessName}`;
      const truncatedDesc =
        description.length > 160 ? `${description.slice(0, 157)}...` : description;

      result[`blog/${post.slug}`] = {
        title,
        description: truncatedDesc,
        canonicalUrl,
        ogTitle: title,
        ogDescription: truncatedDesc,
        ogImage: defaultOgImage,
        noindex: !isPublished,
      };
    }

    return result;
  }

  /**
   * Generate standard compliant sitemap.xml
   */
  public static generateSitemapXml(config: SiteConfiguration, baseUrl: string): string {
    const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
    const today = new Date().toISOString().split("T")[0];

    const urls: Array<{
      loc: string;
      lastmod: string;
      changefreq: string;
      priority: string;
    }> = [];

    const pages = config.pages || [];
    for (const page of pages) {
      const pageRoute = page.slug === "home" || page.slug === "/" ? "" : `/${page.slug.replace(/^\/+/, "")}`;
      const isHome = page.slug === "home" || page.slug === "/";

      urls.push({
        loc: `${cleanBaseUrl}${pageRoute || "/"}`,
        lastmod: today,
        changefreq: isHome ? "daily" : "weekly",
        priority: isHome ? "1.0" : "0.8",
      });
    }

    const blogPosts = (config as any).blogPosts || [];
    for (const post of blogPosts) {
      urls.push({
        loc: `${cleanBaseUrl}/blog/${post.slug}`,
        lastmod: post.publishedAt?.split("T")[0] || today,
        changefreq: "monthly",
        priority: "0.6",
      });
    }

    const xmlItems = urls
      .map(
        (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
      )
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlItems}
</urlset>`;
  }

  /**
   * Generate standard robots.txt
   */
  public static generateRobotsTxt(baseUrl: string): string {
    const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
    return `User-agent: *
Allow: /
Disallow: /api/
Disallow: /preview/
Disallow: /dashboard/
Disallow: /_next/

Sitemap: ${cleanBaseUrl}/sitemap.xml
`;
  }

  /**
   * Generate factual Schema.org JSON-LD (TDD §16.5, FR-047)
   */
  public static generateStructuredData(
    config: SiteConfiguration,
    page: PageRoute | any,
    baseUrl: string
  ): Record<string, unknown> {
    const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
    const rawConfig = config as any;
    const bp = (rawConfig.businessProfile || rawConfig.businessBrief || {}) as Record<string, any>;
    const businessName = this.getBusinessName(config);

    const industry = (bp.industry || "").toLowerCase();
    const baseOrg: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": industry.includes("restaurant") ? "Restaurant" : "LocalBusiness",
      name: businessName,
      description: bp.summary || bp.tagline || page?.description || page?.seo?.description,
      url: cleanBaseUrl,
    };

    if (bp.phone) {
      baseOrg.telephone = bp.phone;
    }
    if (bp.email) {
      baseOrg.email = bp.email;
    }
    if (bp.location || bp.city || bp.country) {
      baseOrg.address = {
        "@type": "PostalAddress",
        ...(bp.city ? { addressLocality: bp.city } : {}),
        ...(bp.country ? { addressCountry: bp.country } : {}),
        ...(bp.location ? { streetAddress: bp.location } : {}),
      };
    }

    // Invariant: Never invent aggregateRating or reviews if none exist in fact ledger
    return baseOrg;
  }
}
