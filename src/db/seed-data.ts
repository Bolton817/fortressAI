import { SiteConfiguration } from "@/core/schema/site-config";
import { tenantRepository } from "./tenant-repository";
import { composeWebsite } from "@/composition/composer";

/**
 * Fortress AI — Synthetic Seed Data for Phase 0 (TDD §33.1, §36)
 * Seeds two distinct tenants:
 * 1. Mara Horizon Expeditions (User A: Tourism / Safari)
 * 2. Nairobi Advisory Partners (User B: Professional Consulting)
 */

export const USER_A_ID = "usr_tenant_a_tourism";
export const SITE_A_ID = "e2d56a78-29bf-45ce-8fa5-7bf611e9f1a1";

export const USER_B_ID = "usr_tenant_b_consulting";
export const SITE_B_ID = "f8a91c32-68da-48eb-9d14-3a25d9c7e2b2";

export const maraHorizonConfig: SiteConfiguration = {
  siteId: SITE_A_ID,
  platformSlug: "mara-horizon",
  version: 1,
  businessProfile: {
    name: "Mara Horizon Expeditions",
    industry: "Tourism & Safari",
    summary: "Bespoke, conservation-focused wildlife safaris and eco-tours across Kenya's Great Rift Valley.",
    location: "Nairobi & Masai Mara, Kenya",
    email: "safari@marahorizon.co.ke",
    phone: "+254711000111",
    whatsapp: "+254711000111",
  },
  theme: {
    themeId: "warm-editorial",
    version: "1.0.0",
  },
  navigation: {
    brandName: "Mara Horizon",
    links: [
      { label: "Home", targetRoute: "/" },
      { label: "Safaris", targetRoute: "/services" },
      { label: "Our Story", targetRoute: "/about" },
      { label: "Contact", targetRoute: "/contact" },
    ],
    sticky: true,
  },
  footer: {
    brandSummary: "Crafting mindful African safari journeys that empower local communities and preserve wildlife habitats.",
    columns: [
      {
        title: "Expeditions",
        links: [
          { label: "Great Migration", href: "/services" },
          { label: "Amboseli Elephants", href: "/services" },
          { label: "Tsavo Wilderness", href: "/services" },
        ],
      },
      {
        title: "Company",
        links: [
          { label: "About Us", href: "/about" },
          { label: "Conservation Pledge", href: "/about" },
          { label: "Contact Us", href: "/contact" },
        ],
      },
    ],
    copyrightText: "© 2026 Mara Horizon Expeditions Ltd. All rights reserved.",
    showWhatsApp: true,
  },
  pages: [
    {
      pageId: "page_home_a",
      slug: "/",
      title: "Luxury & Eco-Safaris in Kenya | Mara Horizon Expeditions",
      pageType: "home",
      seo: {
        title: "Mara Horizon Expeditions | Premier Kenya Wildlife Safaris",
        description: "Experience untamed Kenya with expert guides, luxury eco-camps, and mindful wildlife safaris.",
      },
      sections: [
        {
          instanceId: "sec_header_a",
          sectionId: "shell.header",
          sectionVersion: "1.0.0",
          sortOrder: 0,
          content: {
            brandName: "Mara Horizon",
            links: [
              { label: "Safaris", targetRoute: "/services" },
              { label: "Our Story", targetRoute: "/about" },
              { label: "Contact", targetRoute: "/contact" },
            ],
            ctaText: "Plan Your Safari",
            ctaRoute: "/contact",
          },
          assetBindings: [],
        },
        {
          instanceId: "sec_hero_a",
          sectionId: "hero.split",
          sectionVersion: "1.0.0",
          sortOrder: 1,
          animationPresetOverride: "fade-up",
          content: {
            badge: "Authentic East Africa",
            headline: "Encounter Kenya's Untamed Splendour",
            subheadline: "Private wildlife safaris curated by native guides who know the rhythm of the savannah and the heart of Masai Mara.",
            primaryCtaLabel: "Explore Safaris",
            primaryCtaRoute: "/services",
            secondaryCtaLabel: "Our Story",
            secondaryCtaRoute: "/about",
          },
          assetBindings: [
            {
              slotId: "hero_image",
              assetId: "ast_masai_mara_hero",
              url: "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80",
              altText: "Elephants walking through golden savannah at sunset in Masai Mara, Kenya",
              aspectRatio: "16:9",
              licenceType: "curated-open",
              exportPermitted: true,
            },
          ],
        },
        {
          instanceId: "sec_services_a",
          sectionId: "services.card-grid",
          sectionVersion: "1.0.0",
          sortOrder: 2,
          animationPresetOverride: "stagger-cards",
          content: {
            heading: "Curated Safari Journeys",
            intro: "Designed around small groups, minimal environmental footprints, and unhurried wildlife tracking.",
            items: [
              {
                title: "Great Wildebeest Migration",
                description: "Witness the legendary Mara River crossings with front-row mobile tented camps and veteran naturalists.",
                badge: "July – October",
                ctaLabel: "View Expedition",
                targetRoute: "/services",
              },
              {
                title: "Amboseli Big Tusker Safari",
                description: "Track legendary matriarchs beneath Mount Kilimanjaro's snowcapped peaks in community conservancies.",
                badge: "Year Round",
                ctaLabel: "View Expedition",
                targetRoute: "/services",
              },
              {
                title: "Samburu Special Five Tour",
                description: "Venture north of the equator to spot rare Grevy's zebras, reticulated giraffes, and Somali ostriches.",
                badge: "Specialized",
                ctaLabel: "View Expedition",
                targetRoute: "/services",
              },
            ],
          },
          assetBindings: [],
        },
        {
          instanceId: "sec_about_a",
          sectionId: "about.story",
          sectionVersion: "1.0.0",
          sortOrder: 3,
          content: {
            title: "Safaris Rooted in Conservation & Respect",
            storyParagraphs: [
              "Mara Horizon was founded by licensed Kenya Professional Safari Guides with a simple vision: to take travelers beyond conventional minibuses into the living stories of the African bush.",
              "10% of every journey's revenue is directly channelled into wildlife conservancy ranger teams and clean water initiatives in Narok county.",
            ],
            missionStatement: "Conservation is not an add-on; it is the reason we explore.",
            ctaLabel: "Read Our Conservation Story",
            ctaRoute: "/about",
          },
          assetBindings: [
            {
              slotId: "story_image",
              assetId: "ast_safari_guide",
              url: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=800&q=80",
              altText: "Safari ranger looking through binoculars over the African valley",
              aspectRatio: "4:3",
              licenceType: "curated-open",
              exportPermitted: true,
            },
          ],
        },
        {
          instanceId: "sec_footer_a",
          sectionId: "shell.footer",
          sectionVersion: "1.0.0",
          sortOrder: 4,
          content: {
            brandName: "Mara Horizon",
            brandSummary: "Mindful Kenya wildlife safaris and bespoke expeditions.",
            columns: [
              {
                title: "Routes",
                links: [
                  { label: "Home", href: "/" },
                  { label: "Safaris", href: "/services" },
                  { label: "Our Story", href: "/about" },
                ],
              },
            ],
            contactInfo: {
              email: "safari@marahorizon.co.ke",
              phone: "+254711000111",
              whatsapp: "+254711000111",
              location: "Karen, Nairobi, Kenya",
            },
            copyrightText: "© 2026 Mara Horizon Expeditions Ltd.",
            showWhatsAppFloat: true,
          },
          assetBindings: [],
        },
      ],
    },
  ],
};

export const nairobiAdvisoryConfig: SiteConfiguration = {
  siteId: SITE_B_ID,
  platformSlug: "nairobi-advisory",
  version: 1,
  businessProfile: {
    name: "Nairobi Advisory Partners",
    industry: "Corporate Advisory & Finance",
    summary: "Strategic management consulting, capital advisory, and governance solutions for East African enterprises.",
    location: "Upper Hill, Nairobi, Kenya",
    email: "info@nairobiadvisory.co.ke",
    phone: "+254722000222",
  },
  theme: {
    themeId: "modern-slate",
    version: "1.0.0",
  },
  navigation: {
    brandName: "Nairobi Advisory",
    links: [
      { label: "Overview", targetRoute: "/" },
      { label: "Capabilities", targetRoute: "/services" },
      { label: "Leadership", targetRoute: "/about" },
      { label: "Engage", targetRoute: "/contact" },
    ],
    sticky: true,
  },
  footer: {
    brandSummary: "Providing strategic clarity and corporate advisory excellence across regional markets.",
    columns: [
      {
        title: "Practices",
        links: [
          { label: "Corporate Strategy", href: "/services" },
          { label: "M&A Advisory", href: "/services" },
        ],
      },
    ],
    copyrightText: "© 2026 Nairobi Advisory Partners LLC.",
    showWhatsApp: false,
  },
  pages: [
    {
      pageId: "page_home_b",
      slug: "/",
      title: "Enterprise Advisory & Strategy | Nairobi Advisory Partners",
      pageType: "home",
      seo: {
        title: "Nairobi Advisory Partners | Strategy & Transaction Advisory",
        description: "Advising market leaders and high-growth enterprises across East Africa on strategy, capital, and governance.",
      },
      sections: [
        {
          instanceId: "sec_header_b",
          sectionId: "shell.header",
          sectionVersion: "1.0.0",
          sortOrder: 0,
          content: {
            brandName: "Nairobi Advisory",
            links: [
              { label: "Capabilities", targetRoute: "/services" },
              { label: "Leadership", targetRoute: "/about" },
            ],
            ctaText: "Book Consultation",
            ctaRoute: "/contact",
          },
          assetBindings: [],
        },
        {
          instanceId: "sec_hero_b",
          sectionId: "hero.split",
          sectionVersion: "1.0.0",
          sortOrder: 1,
          animationPresetOverride: "fade-up",
          content: {
            badge: "Regional Enterprise Advisory",
            headline: "Strategic Insight for High-Impact Markets",
            subheadline: "We advise corporations, financial institutions, and family offices navigating growth and capital structuring across East Africa.",
            primaryCtaLabel: "Our Capabilities",
            primaryCtaRoute: "/services",
            secondaryCtaLabel: "Firm Background",
            secondaryCtaRoute: "/about",
          },
          assetBindings: [
            {
              slotId: "hero_image",
              assetId: "ast_nairobi_skyline",
              url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
              altText: "Modern architectural glass office tower in business district",
              aspectRatio: "16:9",
              licenceType: "curated-open",
              exportPermitted: true,
            },
          ],
        },
        {
          instanceId: "sec_footer_b",
          sectionId: "shell.footer",
          sectionVersion: "1.0.0",
          sortOrder: 2,
          content: {
            brandName: "Nairobi Advisory Partners",
            brandSummary: "Corporate advisory and transaction services.",
            columns: [
              {
                title: "Practices",
                links: [{ label: "Advisory", href: "/services" }],
              },
            ],
            contactInfo: {
              email: "info@nairobiadvisory.co.ke",
              phone: "+254722000222",
              location: "Upper Hill, Nairobi, Kenya",
            },
            copyrightText: "© 2026 Nairobi Advisory Partners LLC.",
            showWhatsAppFloat: false,
          },
          assetBindings: [],
        },
      ],
    },
  ],
};

export const USER_C_ID = "usr_tenant_c_composed";
export const SITE_C_ID = "c1a2b3c4-1111-4111-a111-999999999999";

/**
 * Initializes the repository with sample tenants for Phase 0 and Phase 1 proof
 */
export function seedPhase0Tenants(): void {
  // Tenant A: Mara Horizon Expeditions
  tenantRepository.seedSite(
    USER_A_ID,
    {
      id: SITE_A_ID,
      ownerUserId: USER_A_ID,
      name: "Mara Horizon Expeditions",
      platformSlug: "mara-horizon",
      lifecycleStatus: "draft",
    },
    maraHorizonConfig
  );

  // Tenant B: Nairobi Advisory Partners
  tenantRepository.seedSite(
    USER_B_ID,
    {
      id: SITE_B_ID,
      ownerUserId: USER_B_ID,
      name: "Nairobi Advisory Partners",
      platformSlug: "nairobi-advisory",
      lifecycleStatus: "draft",
    },
    nairobiAdvisoryConfig
  );

  // Tenant C: Serengeti Echoes (Phase 1 5-Page Composed Site)
  // Dynamically composed via composeWebsite with verified facts
  const serengetiEchoesConfig = composeWebsite(
    SITE_C_ID,
    "serengeti-echoes",
    {
      name: "Serengeti Echoes Safaris",
      industry: "Tourism & Safari",
      summary: "Mindful wildlife journeys across the Great Rift Valley and Mara ecosystem.",
      location: "Nairobi & Narok, Kenya",
      email: "safari@serengetiechoes.co.ke",
      phone: "+254711999888",
      whatsapp: "+254711999888",
      verifiedTestimonials: [
        {
          quote: "An extraordinary journey. Their deep respect for wildlife and local Maasai guides made this unforgettable.",
          authorName: "Sarah Jenkins",
          authorTitle: "Conservation Photographer",
        },
      ],
      verifiedMetrics: [
        { value: "100%", label: "Locally Guided", context: "100% indigenous Maasai field guides" },
        { value: "14+", label: "Years in Field", context: "Continuous conservation tracking" },
        { value: "0", label: "Single-Use Plastics", context: "Certified zero-waste camp operations" },
      ],
    },
    "seed_serengeti_demo"
  );

  tenantRepository.seedSite(
    USER_C_ID,
    {
      id: SITE_C_ID,
      ownerUserId: USER_C_ID,
      name: "Serengeti Echoes Safaris",
      platformSlug: "serengeti-echoes",
      lifecycleStatus: "draft",
    },
    serengetiEchoesConfig
  );
}

