import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { sectionRegistry } from "@/registry";
import { SectionManifestSchema } from "@/core/schema/manifest";
import { compileSiteToStatic } from "@/exporter/static-compiler";
import { SiteConfiguration, AssetBinding } from "@/core/schema/site-config";

const sampleFixtures: Record<string, { content: Record<string, any>; assetBindings?: AssetBinding[] }> = {
  "shell.header": {
    content: {
      brandName: "Fortress Enterprise",
      links: [
        { label: "Home", targetRoute: "/" },
        { label: "Services", targetRoute: "/services" },
        { label: "Contact", targetRoute: "/contact", isButton: true },
      ],
    },
  },
  "hero.split": {
    content: {
      badge: "Verified Platform",
      heading: "Architecting Modern High-Performance Websites",
      subhead: "Autonomous deterministic design engine for modern businesses.",
      primaryCtaLabel: "Explore Solutions",
      primaryCtaRoute: "/services",
      secondaryCtaLabel: "Contact Team",
      secondaryCtaRoute: "/contact",
    },
    assetBindings: [
      {
        slotId: "hero_primary",
        assetId: "ast_safari_01",
        url: "https://images.unsplash.com/photo-1516426122078-c23e76319801",
        altText: "Hero scenery",
      },
    ],
  },
  "hero.centered": {
    content: {
      badge: "Excellence in Engineering",
      heading: "Elevate Your Digital Brand with Precision",
      subhead: "Tailored web architectures built for speed, accessibility, and conversion.",
      primaryCtaLabel: "Get Started",
      primaryCtaRoute: "/contact",
    },
  },
  "hero.lead-form": {
    content: {
      badge: "Free Consultation",
      heading: "Accelerate Your Business Growth Today",
      subhead: "Request a custom discovery session with our senior architects.",
      formTitle: "Request a Proposal",
      formButtonLabel: "Submit Request",
    },
  },
  "hero.editorial": {
    content: {
      kicker: "Field Narrative",
      headline: "The Art of Sustainable Craftsmanship in Modern Design",
      subhead: "Exploring intentional design, organic textures, and regional authenticity.",
      lead: "Exploring intentional design, organic textures, and regional authenticity.",
      authorOrLocation: "Nairobi, Kenya",
      readTime: "4 min read",
      ctaLabel: "Read More",
      ctaRoute: "/about",
    },
  },
  "services.card-grid": {
    content: {
      badge: "Capabilities",
      heading: "Specialized Advisory Services",
      subhead: "End-to-end capabilities tailored to demanding regional environments.",
      items: [
        { title: "Strategic Advisory", description: "Market positioning and expansion strategy.", icon: "compass" },
        { title: "Systems Engineering", description: "Resilient cloud infrastructure and APIs.", icon: "code" },
        { title: "Brand Identity", description: "Cohesive visual narratives and tokens.", icon: "sparkles" },
      ],
    },
  },
  "services.alternating-rows": {
    content: {
      badge: "Deep Dive",
      heading: "Our Core Delivery Methodology",
      subhead: "Step-by-step rigorous execution from discovery to deployment.",
      items: [
        {
          title: "Discovery & Blueprinting",
          description: "Uncovering business requirements and mapping system constraints.",
          points: ["Stakeholder alignment", "Technical feasibility audit"],
        },
        {
          title: "Architectural Synthesis",
          description: "Generating production-ready components and verified design tokens.",
          points: ["WCAG 2.2 contrast compliance", "Zero-runtime static export"],
        },
      ],
    },
  },
  "services.list-detailed": {
    content: {
      badge: "Services Catalogue",
      heading: "Comprehensive Engagement Scopes",
      subhead: "Transparent scope boundaries and guaranteed deliverables.",
      items: [
        {
          title: "Enterprise Architecture Review",
          summary: "Complete evaluation of frontend and backend boundaries.",
          deliverables: ["Architecture decision record", "Performance benchmark audit"],
        },
      ],
    },
  },
  "services.pricing-table": {
    content: {
      badge: "Transparent Tiers",
      heading: "Investment Plans",
      subhead: "Predictable pricing with zero hidden vendor lock-in.",
      tiers: [
        {
          name: "Growth",
          price: "$1,200",
          period: "/month",
          description: "Ideal for scaling operations.",
          features: ["5 Dedicated Pages", "Cloudflare CDN Hosting", "Weekly Backups"],
          ctaLabel: "Select Growth",
          ctaRoute: "/contact",
          featured: true,
        },
      ],
    },
  },
  "about.story": {
    content: {
      badge: "Our Heritage",
      heading: "Rooted in Purpose, Built for Durability",
      subhead: "A journey dedicated to craft and architectural integrity.",
      storyParagraphs: [
        "Founded with the conviction that digital platforms must be authentic, resilient, and enduring.",
        "We combine regional craft heritage with world-class engineering standards.",
      ],
    },
  },
  "about.values-grid": {
    content: {
      badge: "Principles",
      heading: "What Governs Our Decisions",
      subhead: "Non-negotiable ethical and architectural standards.",
      values: [
        { title: "Factuality First", description: "Never fabricate testimonials, metrics, or credentials." },
        { title: "Inclusive Access", description: "Strict WCAG 2.2 AA contrast and keyboard accessibility." },
      ],
    },
  },
  "about.team-grid": {
    content: {
      badge: "Leadership",
      heading: "Meet the Practitioners",
      subhead: "Decades of collective experience across engineering and design.",
      members: [
        { name: "Faith Wanjiku", role: "Managing Principal", bio: "Leading strategic design and digital systems." },
      ],
    },
  },
  "proof.metrics-counter": {
    content: {
      badge: "Impact",
      heading: "Measurable Real-World Impact",
      subhead: "Verifiable milestones achieved with our client partners.",
      metrics: [
        { value: "99.98%", label: "Uptime Reliability", context: "SLA across all hosted nodes" },
        { value: "< 50ms", label: "Edge Latency", context: "Global cached response time" },
      ],
    },
  },
  "proof.testimonials-slider": {
    content: {
      badge: "Endorsements",
      heading: "Trusted by Industry Leaders",
      subhead: "Direct verified feedback from active executive clients.",
      testimonials: [
        {
          quote: "The rigor and speed of delivery exceeded every expectation.",
          authorName: "David Kiprop",
          authorTitle: "CTO, Safari Tech Africa",
        },
      ],
    },
  },
  "faq.accordion": {
    content: {
      badge: "Common Questions",
      heading: "Frequently Asked Questions",
      subhead: "Clear answers to foundational questions about our process.",
      faqs: [
        {
          question: "Can we export the website to self-hosted infrastructure?",
          answer: "Yes, Fortress AI guarantees 100% portable static exports without runtime lock-in.",
        },
      ],
    },
  },
  "cta.fullwidth-accent": {
    content: {
      headline: "Ready to Build Your Modern Digital Presence?",
      subhead: "Connect directly with our architects to begin your journey.",
      ctaLabel: "Schedule Discovery",
      ctaRoute: "/contact",
    },
  },
  "contact.split-details": {
    content: {
      badge: "Reach Us",
      heading: "Let's Start a Conversation",
      subhead: "We are available across Nairobi and global digital channels.",
      email: "contact@fortress-ai.com",
      phone: "+254 700 123 456",
      whatsapp: "+254 700 123 456",
      address: "Riverside Drive, Nairobi, Kenya",
      operatingHours: "Mon - Fri: 8:00 AM - 5:00 PM EAT",
    },
  },
  "blog.index": {
    content: {
      badge: "Publications",
      heading: "Perspectives & Research",
      subhead: "In-depth writing on technology, architecture, and craft.",
      articles: [
        {
          title: "Designing for Offline-First and Low-Bandwidth Networks",
          excerpt: "Techniques for maintaining rich visual fidelity under bandwidth constraints.",
          date: "October 14, 2026",
          category: "Engineering",
          route: "/blog/offline-first",
          readTime: "6 min",
        },
      ],
    },
  },
  "shell.footer": {
    content: {
      brandName: "Fortress Enterprise",
      brandSummary: "Autonomous design engine producing resilient, accessible websites.",
      columns: [
        {
          title: "Navigation",
          links: [
            { label: "Home", href: "/" },
            { label: "Services", href: "/services" },
          ],
        },
      ],
      copyrightText: "© 2026 Fortress Enterprise. All rights reserved.",
      showWhatsApp: true,
      whatsappNumber: "+254700123456",
    },
  },
  "shell.footer.minimal": {
    content: {
      brandName: "Fortress AI",
      copyrightText: "© 2026 Fortress AI. Clean static output.",
      links: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
      ],
    },
  },
};

describe("Phase 1 — Section Manifests & Component Fixtures Suite (TDD §9, ADR-004, FR-020)", () => {
  const manifests = sectionRegistry.listManifests();

  it("registers exactly 20 curated section variants in the registry", () => {
    expect(manifests.length).toBe(20);
    const ids = manifests.map((m) => m.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(20);
  });

  it("covers all 8 required section families", () => {
    const ids = manifests.map((m) => m.id);
    expect(ids.some((id) => id.startsWith("shell.header"))).toBe(true);
    expect(ids.some((id) => id.startsWith("hero."))).toBe(true);
    expect(ids.some((id) => id.startsWith("services."))).toBe(true);
    expect(ids.some((id) => id.startsWith("about."))).toBe(true);
    expect(ids.some((id) => id.startsWith("proof."))).toBe(true);
    expect(ids.some((id) => id.startsWith("faq."))).toBe(true);
    expect(ids.some((id) => id.startsWith("cta."))).toBe(true);
    expect(ids.some((id) => id.startsWith("contact."))).toBe(true);
    expect(ids.some((id) => id.startsWith("blog."))).toBe(true);
    expect(ids.some((id) => id.startsWith("shell.footer"))).toBe(true);
  });

  manifests.forEach((manifest) => {
    describe(`Manifest & Fixture: [${manifest.id}]`, () => {
      it("passes strict Zod SectionManifestSchema validation", () => {
        const parsed = SectionManifestSchema.safeParse(manifest);
        expect(parsed.success).toBe(true);
      });

      it("declares staticSafe: true in export capability contract", () => {
        expect(manifest.export.staticSafe).toBe(true);
      });

      it("declares WCAG 2.2 accessibility contract compliance", () => {
        expect(manifest.accessibility.focusVisible).toBe(true);
        expect(manifest.accessibility.reducedMotionFallback).toBe(true);
        expect(typeof manifest.accessibility.semanticHeadingLevel).toBe("boolean");
      });

      it("renders React component without crashing on realistic sample fixture", () => {
        const entry = sectionRegistry.getEntry(manifest.id);
        expect(typeof entry.component).toBe("function");

        const fixture = sampleFixtures[manifest.id] || { content: {} };

        const element = React.createElement(entry.component, {
          instanceId: `inst_${manifest.id.replace(/\./g, "_")}`,
          content: fixture.content,
          assetBindings: fixture.assetBindings || [],
          animationPreset: "fade-up",
        });

        const markup = renderToStaticMarkup(element);
        expect(typeof markup).toBe("string");
        expect(markup.length).toBeGreaterThan(0);
      });

      it("compiles through static export compiler without throwing errors", () => {
        const fixture = sampleFixtures[manifest.id] || { content: {} };

        const singleSectionSite: SiteConfiguration = {
          siteId: "11111111-1111-4111-a111-111111111111",
          platformSlug: "test-single-section",
          version: 1,
          businessProfile: {
            name: "Test Business",
            industry: "Technology",
            summary: "Test business profile summary.",
          },
          theme: {
            themeId: "modern-slate",
            version: "1.0.0",
          },
          navigation: {
            brandName: "Test Business",
            links: [{ label: "Home", targetRoute: "/" }],
          },
          footer: {
            brandSummary: "Summary",
            columns: [],
            copyrightText: "© 2026 Test Business",
          },
          pages: [
            {
              pageId: "page_home",
              slug: "/",
              title: "Home",
              pageType: "home",
              seo: {
                title: "Home | Test Business",
                description: "Test description",
              },
              sections: [
                {
                  instanceId: "inst_test",
                  sectionId: manifest.id,
                  sectionVersion: manifest.version,
                  content: fixture.content,
                  assetBindings: fixture.assetBindings || [],
                },
              ],
            },
          ],
        };

        const exportResult = compileSiteToStatic(singleSectionSite);
        expect(exportResult.files.length).toBeGreaterThanOrEqual(1);
        const indexHtml = exportResult.files.find((f) => f.path === "index.html");
        expect(indexHtml).toBeDefined();
        expect(indexHtml?.content).toContain("<!DOCTYPE html>");
      });
    });
  });
});
