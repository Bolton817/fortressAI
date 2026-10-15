import { describe, it, expect } from "vitest";
import { SeoGenerator } from "@/core/publish/seo-generator";
import { maraHorizonConfig } from "@/db/seed-data";

describe("Phase 4: Deterministic SEO, Sitemap & Structured Data (TDD §16.5; FR-045, FR-046, FR-047)", () => {
  const baseUrl = "https://mara-horizon.fortressai.app";

  const multiPageConfig = JSON.parse(JSON.stringify(maraHorizonConfig));
  multiPageConfig.pages.push(
    {
      pageId: "page_about",
      slug: "/about",
      title: "About Us",
      pageType: "about",
      seo: { title: "About Us | Mara Horizon Expeditions", description: "Our conservation mission and roots." },
      sections: [],
    },
    {
      pageId: "page_services",
      slug: "/services",
      title: "Safari Expeditions",
      pageType: "services",
      seo: { title: "Safaris | Mara Horizon Expeditions", description: "Mindful African wildlife journeys." },
      sections: [],
    },
    {
      pageId: "page_contact",
      slug: "/contact",
      title: "Contact",
      pageType: "contact",
      seo: { title: "Contact | Mara Horizon Expeditions", description: "Reach out to our guides." },
      sections: [],
    }
  );

  describe("Route-Level SEO Metadata (FR-045)", () => {
    it("generates valid titles, truncated descriptions, and canonical URLs for all pages", () => {
      const metadata = SeoGenerator.generateAllMetadata(
        multiPageConfig,
        baseUrl,
        true
      );

      // Home route (accessible via 'home' or '/')
      expect(metadata["home"]).toBeDefined();
      expect(metadata["home"].title).toContain(maraHorizonConfig.businessProfile.name);
      expect(metadata["home"].canonicalUrl).toBe(`${baseUrl}/`);
      expect(metadata["home"].description.length).toBeLessThanOrEqual(160);
      expect(metadata["home"].noindex).toBe(false);

      // About route
      expect(metadata["about"]).toBeDefined();
      expect(metadata["about"].title).toContain("About Us");
      expect(metadata["about"].canonicalUrl).toBe(`${baseUrl}/about`);
      expect(metadata["about"].description.length).toBeLessThanOrEqual(160);
    });

    it("enforces noindex on private previews and drafts", () => {
      const previewMetadata = SeoGenerator.generateAllMetadata(
        multiPageConfig,
        baseUrl,
        false // isPublished: false
      );

      expect(previewMetadata["home"].noindex).toBe(true);
      expect(previewMetadata["about"].noindex).toBe(true);
    });
  });

  describe("Compliant XML Sitemap (FR-046)", () => {
    it("generates well-formed XML sitemap listing all published core routes", () => {
      const xml = SeoGenerator.generateSitemapXml(multiPageConfig, baseUrl);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(xml).toContain(`<loc>${baseUrl}/</loc>`);
      expect(xml).toContain(`<loc>${baseUrl}/about</loc>`);
      expect(xml).toContain(`<loc>${baseUrl}/services</loc>`);
      expect(xml).toContain(`<loc>${baseUrl}/contact</loc>`);
      expect(xml).toContain("<changefreq>");
      expect(xml).toContain("<priority>");
      expect(xml).toContain("</urlset>");
    });

    it("includes published blog articles in sitemap if present", () => {
      const configWithBlog = JSON.parse(JSON.stringify(multiPageConfig));
      configWithBlog.blogPosts = [
        {
          slug: "top-safari-tips",
          title: "Top 10 Safari Tips",
          excerpt: "Essential guide for your first safari in Kenya.",
          publishedAt: "2026-10-15T00:00:00Z",
        },
      ];

      const xml = SeoGenerator.generateSitemapXml(configWithBlog, baseUrl);
      expect(xml).toContain(`<loc>${baseUrl}/blog/top-safari-tips</loc>`);
    });
  });

  describe("Robots.txt Directive (FR-046)", () => {
    it("generates compliant robots.txt allowing public routes and disallowing private routes", () => {
      const robots = SeoGenerator.generateRobotsTxt(baseUrl);

      expect(robots).toContain("User-agent: *");
      expect(robots).toContain("Allow: /");
      expect(robots).toContain("Disallow: /api/");
      expect(robots).toContain("Disallow: /preview/");
      expect(robots).toContain("Disallow: /dashboard/");
      expect(robots).toContain(`Sitemap: ${baseUrl}/sitemap.xml`);
    });
  });

  describe("Schema.org JSON-LD Structured Data (FR-047)", () => {
    it("generates valid LocalBusiness / Organization structure without fabricated ratings", () => {
      const homePage = maraHorizonConfig.pages[0];
      const jsonLd = SeoGenerator.generateStructuredData(
        maraHorizonConfig,
        homePage,
        baseUrl
      );

      expect(jsonLd["@context"]).toBe("https://schema.org");
      expect(jsonLd["name"]).toBe(maraHorizonConfig.businessProfile.name);
      expect(jsonLd["url"]).toBe(baseUrl);

      // Invariant (TDD §16.5, FR-047): Zero invented reviews, ratings, or prices
      expect(jsonLd).not.toHaveProperty("aggregateRating");
      expect(jsonLd).not.toHaveProperty("review");
      expect(jsonLd).not.toHaveProperty("priceRange");
    });
  });
});
