import { describe, it, expect } from "vitest";
import { composeWebsite } from "@/composition/composer";
import { compileSiteToStatic } from "@/exporter/static-compiler";

describe("Phase 1 — Deterministic Composition Engine (TDD §8, ADR-002, FR-020, FR-021)", () => {
  it("composes a full 5-page website for an Eco-Safari business with warm-editorial theme", () => {
    const config = composeWebsite(
      "c1a2b3c4-1111-4111-a111-000000000001",
      "serengeti-echoes",
      {
        name: "Serengeti Echoes Safaris",
        industry: "Tourism & Safari",
        summary: "Mindful wildlife journeys across the Great Rift Valley.",
        location: "Nairobi, Kenya",
        email: "safari@serengetiechoes.co.ke",
        phone: "+254711999888",
        whatsapp: "+254711999888",
      },
      "seed_safari_01"
    );

    expect(config.siteId).toBe("c1a2b3c4-1111-4111-a111-000000000001");
    expect(config.theme.themeId).toBe("warm-editorial");

    // 5 core pages
    expect(config.pages.length).toBe(5);
    const slugs = config.pages.map((p) => p.slug);
    expect(slugs).toContain("/");
    expect(slugs).toContain("/services");
    expect(slugs).toContain("/about");
    expect(slugs).toContain("/contact");
    expect(slugs).toContain("/blog");

    // Page skeleton invariants (TDD §8.3): Hero first, footer last
    for (const page of config.pages) {
      const firstSec = page.sections[0];
      const lastSec = page.sections[page.sections.length - 1];

      expect(firstSec.sectionId).toBe("shell.header");
      expect(lastSec.sectionId).toMatch(/^shell\.footer/);
    }
  });

  it("strictly obeys factuality guardrail: omits testimonials when no verified reviews exist", () => {
    const withoutReviews = composeWebsite(
      "c1a2b3c4-1111-4111-a111-000000000002",
      "plain-consulting",
      {
        name: "Plain Advisory",
        industry: "Corporate Consulting",
        summary: "Executive advisory services.",
      },
      "seed_noreview"
    );

    const homeSections = withoutReviews.pages[0].sections.map((s) => s.sectionId);
    expect(homeSections).not.toContain("proof.testimonials-slider");
    expect(homeSections).toContain("proof.metrics-counter");
  });

  it("renders testimonials when verified authentic quotes are provided (TDD §16.5, FR-043)", () => {
    const withReviews = composeWebsite(
      "c1a2b3c4-1111-4111-a111-000000000003",
      "proven-advisory",
      {
        name: "Proven Advisory",
        industry: "Corporate Consulting",
        summary: "Executive advisory services.",
        verifiedTestimonials: [
          {
            quote: "Exceptional depth of insight in East African capital structuring.",
            authorName: "Grace Muthoni",
            authorTitle: "Managing Director, Rift Holdings",
          },
        ],
      },
      "seed_withreview"
    );

    const homeSections = withReviews.pages[0].sections.map((s) => s.sectionId);
    expect(homeSections).toContain("proof.testimonials-slider");
  });

  it("selects appropriate theme automatically based on business category", () => {
    const craftSite = composeWebsite(
      "c1a2b3c4-1111-4111-a111-000000000004",
      "nairobi-timber",
      {
        name: "Nairobi Timber Craft",
        industry: "Artisanal Woodworking & Craft",
        summary: "Hand-crafted sustainable hardwood furniture.",
      }
    );
    expect(craftSite.theme.themeId).toBe("bold-craft");

    const healthSite = composeWebsite(
      "c1a2b3c4-1111-4111-a111-000000000005",
      "serene-wellness",
      {
        name: "Serene Health Clinic",
        industry: "Healthcare & Wellness",
        summary: "Preventative medicine and holistic wellness therapy.",
      }
    );
    expect(healthSite.theme.themeId).toBe("ocean-minimal");
  });

  it("compiles the composed 5-page site into a complete static package (TDD §21)", () => {
    const site = composeWebsite(
      "c1a2b3c4-1111-4111-a111-000000000006",
      "export-demo",
      {
        name: "Kilifi Coastal Retreat",
        industry: "Hospitality",
        summary: "Boutique oceanfront eco-villas.",
        location: "Kilifi, Kenya",
      }
    );

    const result = compileSiteToStatic(site);
    const files = result.files.map((f) => f.path);

    expect(files).toContain("index.html");
    expect(files).toContain("services.html");
    expect(files).toContain("about.html");
    expect(files).toContain("contact.html");
    expect(files).toContain("blog.html");
    expect(files).toContain("sitemap.xml");
    expect(files).toContain("robots.txt");
    expect(files).toContain("dependencies.json");
    expect(files).toContain("README.md");

    const sitemap = result.files.find((f) => f.path === "sitemap.xml")!.content;
    expect(sitemap).toContain("<loc>https://export-demo.fortress-ai.com</loc>");
    expect(sitemap).toContain("<loc>https://export-demo.fortress-ai.com/services</loc>");
    expect(sitemap).toContain("<loc>https://export-demo.fortress-ai.com/about</loc>");
    expect(sitemap).toContain("<loc>https://export-demo.fortress-ai.com/contact</loc>");
    expect(sitemap).toContain("<loc>https://export-demo.fortress-ai.com/blog</loc>");
  });
});
