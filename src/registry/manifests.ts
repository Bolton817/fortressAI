import { SectionManifest } from "@/core/schema/manifest";

export const headerManifest: SectionManifest = {
  id: "shell.header",
  version: "1.0.0",
  label: "Sticky Navigation Header",
  description: "Sticky site header with logo or brand text fallback, desktop menu, mobile drawer, and CTA button.",
  pageTypes: ["home", "about", "services", "blog", "contact"],
  industries: ["general"],
  layoutType: "sticky-header",
  contentSchemaVersion: "shell.header.v1",
  mediaSlots: [
    {
      slotId: "logo",
      required: false,
      aspectRatio: "auto",
      acceptedSubjectTags: ["logo", "brand-mark"],
      description: "Company logo. If missing, textual brand name is displayed.",
    },
  ],
  animationPresets: ["micro-interaction"],
  accessibility: {
    semanticHeadingLevel: false,
    semanticList: true,
    focusVisible: true,
    reducedMotionFallback: true,
    notes: "Uses semantic <header> and <nav> with accessible mobile toggle.",
  },
  export: {
    staticSafe: true,
    dependencies: [],
  },
  status: "released",
};

export const heroSplitManifest: SectionManifest = {
  id: "hero.split",
  version: "1.0.0",
  label: "Split Hero with Visual Media",
  description: "Prominent conversion hero section with semantic H1, descriptive copy, dual CTAs, and a high-resolution media slot.",
  pageTypes: ["home"],
  industries: ["general", "tourism", "professional-services"],
  layoutType: "hero-split-grid",
  contentSchemaVersion: "hero.split.v1",
  mediaSlots: [
    {
      slotId: "hero_image",
      required: true,
      aspectRatio: "16:9",
      acceptedSubjectTags: ["hero", "landscape", "workspace", "action"],
      description: "Primary visual representation for the business value proposition.",
    },
  ],
  animationPresets: ["fade-up", "hero-crossfade"],
  accessibility: {
    semanticHeadingLevel: true,
    focusVisible: true,
    reducedMotionFallback: true,
    notes: "Renders exactly one meaningful H1 tag.",
  },
  export: {
    staticSafe: true,
    dependencies: [],
  },
  status: "released",
};

export const heroCenteredManifest: SectionManifest = {
  id: "hero.centered",
  version: "1.0.0",
  label: "Centered Impact Hero",
  description: "High-impact centered typography hero with optional background media and clear single/dual conversion actions.",
  pageTypes: ["home", "about"],
  industries: ["general", "consulting", "tech", "non-profit"],
  layoutType: "hero-centered-stack",
  contentSchemaVersion: "hero.centered.v1",
  mediaSlots: [
    {
      slotId: "hero_centered_bg",
      required: false,
      aspectRatio: "16:9",
      acceptedSubjectTags: ["hero", "abstract", "nature", "workspace"],
      description: "Optional full-width background photo or subtle ambient visual.",
    },
  ],
  animationPresets: ["fade-up", "hero-crossfade"],
  accessibility: {
    semanticHeadingLevel: true,
    focusVisible: true,
    reducedMotionFallback: true,
  },
  export: {
    staticSafe: true,
    dependencies: [],
  },
  status: "released",
};

export const heroLeadFormManifest: SectionManifest = {
  id: "hero.lead-form",
  version: "1.0.0",
  label: "Conversion Hero with Integrated Lead Capture",
  description: "High-intent lead generation hero combining strong headline value with an immediate inquiry card.",
  pageTypes: ["home", "contact"],
  industries: ["trades", "finance", "real-estate", "consulting"],
  layoutType: "hero-split-form",
  contentSchemaVersion: "hero.lead-form.v1",
  mediaSlots: [],
  animationPresets: ["fade-up"],
  accessibility: {
    semanticHeadingLevel: true,
    focusVisible: true,
    reducedMotionFallback: true,
  },
  export: {
    staticSafe: true,
    dependencies: ["lead-capture-api"],
  },
  status: "released",
};

export const heroEditorialManifest: SectionManifest = {
  id: "hero.editorial",
  version: "1.0.0",
  label: "Editorial Magazine Hero",
  description: "Warm, publication-style hero with prominent serif typography, kicker tag, pull quote, and featured 4:3 photography.",
  pageTypes: ["home", "about", "blog"],
  industries: ["safari", "hospitality", "creative", "artisanal"],
  layoutType: "hero-editorial-asymmetric",
  contentSchemaVersion: "hero.editorial.v1",
  mediaSlots: [
    {
      slotId: "hero_editorial_photo",
      required: true,
      aspectRatio: "4:3",
      acceptedSubjectTags: ["landscape", "portrait", "craft", "wildlife"],
      description: "Atmospheric 4:3 editorial photograph capturing authentic place or artisan work.",
    },
  ],
  animationPresets: ["image-reveal", "fade-up"],
  accessibility: {
    semanticHeadingLevel: true,
    focusVisible: true,
    reducedMotionFallback: true,
  },
  export: {
    staticSafe: true,
    dependencies: [],
  },
  status: "released",
};

export const servicesCardGridManifest: SectionManifest = {
  id: "services.card-grid",
  version: "1.0.0",
  label: "Services Card Grid",
  description: "A responsive grid displaying 3 to 6 structured service or product offerings with dedicated CTA links.",
  pageTypes: ["home", "services"],
  industries: ["general", "professional-services", "tourism"],
  layoutType: "responsive-card-grid",
  contentSchemaVersion: "services.card-grid.v1",
  mediaSlots: [],
  animationPresets: ["fade-up", "stagger-cards"],
  accessibility: {
    semanticHeadingLevel: true,
    semanticList: true,
    focusVisible: true,
    reducedMotionFallback: true,
    notes: "Uses semantic list and heading hierarchies.",
  },
  export: {
    staticSafe: true,
    dependencies: [],
  },
  status: "released",
};

export const servicesAlternatingManifest: SectionManifest = {
  id: "services.alternating-rows",
  version: "1.0.0",
  label: "Alternating Detail Services Narrative",
  description: "In-depth service descriptions presented in alternating zigzag rows with dedicated photography slots.",
  pageTypes: ["services", "about"],
  industries: ["tourism", "craft", "architecture", "consulting"],
  layoutType: "alternating-feature-rows",
  contentSchemaVersion: "services.alternating.v1",
  mediaSlots: [
    {
      slotId: "row_image_1",
      required: false,
      aspectRatio: "4:3",
      acceptedSubjectTags: ["service", "process", "detail"],
    },
    {
      slotId: "row_image_2",
      required: false,
      aspectRatio: "4:3",
      acceptedSubjectTags: ["service", "process", "detail"],
    },
  ],
  animationPresets: ["fade-up", "image-reveal"],
  accessibility: {
    semanticHeadingLevel: true,
    focusVisible: true,
    reducedMotionFallback: true,
  },
  export: {
    staticSafe: true,
    dependencies: [],
  },
  status: "released",
};

export const servicesListManifest: SectionManifest = {
  id: "services.list-detailed",
  version: "1.0.0",
  label: "Numbered Capabilities List",
  description: "Structured numbered catalogue of specialized client capabilities, deliverables, and methodology points.",
  pageTypes: ["services"],
  industries: ["consulting", "law", "tech", "advisory"],
  layoutType: "numbered-list-stack",
  contentSchemaVersion: "services.list.v1",
  mediaSlots: [],
  animationPresets: ["fade-up"],
  accessibility: {
    semanticHeadingLevel: true,
    semanticList: true,
    focusVisible: true,
    reducedMotionFallback: true,
  },
  export: {
    staticSafe: true,
    dependencies: [],
  },
  status: "released",
};

export const servicesPricingManifest: SectionManifest = {
  id: "services.pricing-table",
  version: "1.0.0",
  label: "Transparent Pricing Tiers",
  description: "Side-by-side pricing packages with feature lists, highlighted recommendation tier, and direct inquiry buttons.",
  pageTypes: ["services"],
  industries: ["saas", "subscription", "fitness", "services"],
  layoutType: "pricing-card-columns",
  contentSchemaVersion: "services.pricing.v1",
  mediaSlots: [],
  animationPresets: ["stagger-cards", "fade-up"],
  accessibility: {
    semanticHeadingLevel: true,
    focusVisible: true,
    reducedMotionFallback: true,
  },
  export: {
    staticSafe: true,
    dependencies: [],
  },
  status: "released",
};

export const aboutStoryManifest: SectionManifest = {
  id: "about.story",
  version: "1.0.0",
  label: "About Narrative & Mission",
  description: "A narrative section communicating brand origin, mission, values, and credentials without fabricated claims.",
  pageTypes: ["home", "about"],
  industries: ["general", "professional-services", "tourism"],
  layoutType: "split-narrative",
  contentSchemaVersion: "about.story.v1",
  mediaSlots: [
    {
      slotId: "story_image",
      required: false,
      aspectRatio: "4:3",
      acceptedSubjectTags: ["team", "founder", "workspace", "mission"],
      description: "Editorial photo of founder, team, or workspace.",
    },
  ],
  animationPresets: ["fade-up", "image-reveal"],
  accessibility: {
    semanticHeadingLevel: true,
    focusVisible: true,
    reducedMotionFallback: true,
    notes: "Follows semantic document structure.",
  },
  export: {
    staticSafe: true,
    dependencies: [],
  },
  status: "released",
};

export const aboutValuesManifest: SectionManifest = {
  id: "about.values-grid",
  version: "1.0.0",
  label: "Core Principles & Values Grid",
  description: "Four or six foundational pillars and ethical commitments guiding the business.",
  pageTypes: ["about", "home"],
  industries: ["general", "esg", "consulting", "community"],
  layoutType: "values-grid-cards",
  contentSchemaVersion: "about.values.v1",
  mediaSlots: [],
  animationPresets: ["stagger-cards", "fade-up"],
  accessibility: {
    semanticHeadingLevel: true,
    focusVisible: true,
    reducedMotionFallback: true,
  },
  export: {
    staticSafe: true,
    dependencies: [],
  },
  status: "released",
};

export const aboutTeamManifest: SectionManifest = {
  id: "about.team-grid",
  version: "1.0.0",
  label: "Practitioner & Leadership Grid",
  description: "Presents verifiable team leadership profiles, roles, and backgrounds with portrait slots.",
  pageTypes: ["about"],
  industries: ["consulting", "healthcare", "agency", "tech"],
  layoutType: "team-portrait-grid",
  contentSchemaVersion: "about.team.v1",
  mediaSlots: [
    {
      slotId: "team_member_1",
      required: false,
      aspectRatio: "1:1",
      acceptedSubjectTags: ["portrait", "person"],
    },
    {
      slotId: "team_member_2",
      required: false,
      aspectRatio: "1:1",
      acceptedSubjectTags: ["portrait", "person"],
    },
    {
      slotId: "team_member_3",
      required: false,
      aspectRatio: "1:1",
      acceptedSubjectTags: ["portrait", "person"],
    },
  ],
  animationPresets: ["stagger-cards", "fade-up"],
  accessibility: {
    semanticHeadingLevel: true,
    focusVisible: true,
    reducedMotionFallback: true,
  },
  export: {
    staticSafe: true,
    dependencies: [],
  },
  status: "released",
};

export const proofMetricsManifest: SectionManifest = {
  id: "proof.metrics-counter",
  version: "1.0.0",
  label: "Quantitative Metrics & Proof Counters",
  description: "Displays confirmed quantitative facts and track record milestones.",
  pageTypes: ["home", "about", "services"],
  industries: ["general", "consulting", "tourism", "finance", "trades"],
  layoutType: "metrics-bar",
  contentSchemaVersion: "proof.metrics.v1",
  mediaSlots: [],
  animationPresets: ["count-up", "fade-up"],
  accessibility: {
    semanticHeadingLevel: false,
    focusVisible: true,
    reducedMotionFallback: true,
  },
  export: {
    staticSafe: true,
    dependencies: [],
  },
  status: "released",
};

export const proofTestimonialsManifest: SectionManifest = {
  id: "proof.testimonials-slider",
  version: "1.0.0",
  label: "Verified Client Endorsements",
  description: "Displays authentic customer feedback with strict factuality enforcement (omitted if unverified).",
  pageTypes: ["home", "services", "about"],
  industries: ["general", "tourism", "consulting", "services"],
  layoutType: "quote-cards-grid",
  contentSchemaVersion: "proof.testimonials.v1",
  mediaSlots: [],
  animationPresets: ["fade-up", "stagger-cards"],
  accessibility: {
    semanticHeadingLevel: true,
    focusVisible: true,
    reducedMotionFallback: true,
  },
  export: {
    staticSafe: true,
    dependencies: [],
  },
  status: "released",
};

export const faqAccordionManifest: SectionManifest = {
  id: "faq.accordion",
  version: "1.0.0",
  label: "Accessible FAQ Accordion",
  description: "Collapsible questions and answers addressing customer concerns with full keyboard navigation.",
  pageTypes: ["services", "contact", "home"],
  industries: ["general", "services", "ecommerce", "tourism"],
  layoutType: "accordion-list",
  contentSchemaVersion: "faq.accordion.v1",
  mediaSlots: [],
  animationPresets: ["fade-up"],
  accessibility: {
    semanticHeadingLevel: true,
    focusVisible: true,
    reducedMotionFallback: true,
  },
  export: {
    staticSafe: true,
    dependencies: [],
  },
  status: "released",
};

export const ctaFullwidthManifest: SectionManifest = {
  id: "cta.fullwidth-accent",
  version: "1.0.0",
  label: "Fullwidth High-Conversion Callout",
  description: "Bold fullwidth primary accent band driving final user conversion across any page.",
  pageTypes: ["home", "services", "about", "blog"],
  industries: ["general"],
  layoutType: "fullwidth-callout",
  contentSchemaVersion: "cta.fullwidth.v1",
  mediaSlots: [],
  animationPresets: ["fade-up"],
  accessibility: {
    semanticHeadingLevel: true,
    focusVisible: true,
    reducedMotionFallback: true,
  },
  export: {
    staticSafe: true,
    dependencies: [],
  },
  status: "released",
};

export const contactSplitManifest: SectionManifest = {
  id: "contact.split-details",
  version: "1.0.0",
  label: "Split Contact Card & Inquiry Channel",
  description: "Direct contact options (Email, Phone, WhatsApp, Physical Address) with interactive feedback card.",
  pageTypes: ["contact"],
  industries: ["general"],
  layoutType: "split-contact-grid",
  contentSchemaVersion: "contact.split.v1",
  mediaSlots: [],
  animationPresets: ["fade-up"],
  accessibility: {
    semanticHeadingLevel: true,
    focusVisible: true,
    reducedMotionFallback: true,
  },
  export: {
    staticSafe: true,
    dependencies: ["contact-api"],
  },
  status: "released",
};

export const blogIndexManifest: SectionManifest = {
  id: "blog.index",
  version: "1.0.0",
  label: "Article & Insights Publication Index",
  description: "Publication-grade editorial grid with featured lead story and structured reading cards.",
  pageTypes: ["blog", "home"],
  industries: ["general", "consulting", "creative", "safari"],
  layoutType: "editorial-article-grid",
  contentSchemaVersion: "blog.index.v1",
  mediaSlots: [
    {
      slotId: "blog_featured_cover",
      required: false,
      aspectRatio: "16:9",
      acceptedSubjectTags: ["article", "landscape", "workspace"],
    },
  ],
  animationPresets: ["fade-up", "image-reveal"],
  accessibility: {
    semanticHeadingLevel: true,
    focusVisible: true,
    reducedMotionFallback: true,
  },
  export: {
    staticSafe: true,
    dependencies: [],
  },
  status: "released",
};

export const footerManifest: SectionManifest = {
  id: "shell.footer",
  version: "1.0.0",
  label: "Four-Column Adaptive Footer",
  description: "Comprehensive 4-column footer collapsing gracefully on mobile viewports; displays brand identity, navigation columns, and contact info.",
  pageTypes: ["home", "about", "services", "blog", "contact"],
  industries: ["general"],
  layoutType: "four-column-footer",
  contentSchemaVersion: "shell.footer.v1",
  mediaSlots: [],
  animationPresets: [],
  accessibility: {
    semanticHeadingLevel: false,
    semanticList: true,
    focusVisible: true,
    reducedMotionFallback: true,
    notes: "Uses semantic <footer> landmark with clear link hierarchies.",
  },
  export: {
    staticSafe: true,
    dependencies: [],
  },
  status: "released",
};

export const footerMinimalManifest: SectionManifest = {
  id: "shell.footer.minimal",
  version: "1.0.0",
  label: "Minimal Single-Row Clean Footer",
  description: "Compact single-row footer for clean minimal portfolios and landing pages.",
  pageTypes: ["home", "about", "services", "blog", "contact"],
  industries: ["general", "minimal"],
  layoutType: "single-row-footer",
  contentSchemaVersion: "shell.footer.minimal.v1",
  mediaSlots: [],
  animationPresets: [],
  accessibility: {
    semanticHeadingLevel: false,
    focusVisible: true,
    reducedMotionFallback: true,
  },
  export: {
    staticSafe: true,
    dependencies: [],
  },
  status: "released",
};

export const allManifests: SectionManifest[] = [
  headerManifest,
  heroSplitManifest,
  heroCenteredManifest,
  heroLeadFormManifest,
  heroEditorialManifest,
  servicesCardGridManifest,
  servicesAlternatingManifest,
  servicesListManifest,
  servicesPricingManifest,
  aboutStoryManifest,
  aboutValuesManifest,
  aboutTeamManifest,
  proofMetricsManifest,
  proofTestimonialsManifest,
  faqAccordionManifest,
  ctaFullwidthManifest,
  contactSplitManifest,
  blogIndexManifest,
  footerManifest,
  footerMinimalManifest,
];
