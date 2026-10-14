import { SectionRegistryEntry } from "./types";
import {
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
  allManifests,
} from "./manifests";

import { HeaderSection } from "./sections/header/component";
import { HeroSplitSection } from "./sections/hero/component";
import { HeroCenteredSection } from "./sections/hero/centered";
import { HeroLeadFormSection } from "./sections/hero/lead-form";
import { HeroEditorialSection } from "./sections/hero/editorial";
import { ServicesCardGridSection } from "./sections/services/component";
import { ServicesAlternatingSection } from "./sections/services/alternating-rows";
import { ServicesListSection } from "./sections/services/list-detailed";
import { ServicesPricingSection } from "./sections/services/pricing-table";
import { AboutStorySection } from "./sections/about/component";
import { AboutValuesSection } from "./sections/about/values-grid";
import { AboutTeamSection } from "./sections/about/team-grid";
import { ProofMetricsSection } from "./sections/proof/metrics-counter";
import { ProofTestimonialsSection } from "./sections/proof/testimonials-slider";
import { FaqAccordionSection } from "./sections/faq/accordion";
import { CtaFullwidthSection } from "./sections/cta/fullwidth-accent";
import { ContactSplitSection } from "./sections/contact/split-details";
import { BlogIndexSection } from "./sections/blog/index-component";
import { FooterSection } from "./sections/footer/component";
import { FooterMinimalSection } from "./sections/footer/minimal";
import { ManifestNotFoundError } from "@/core/errors";

export { allManifests };

/**
 * Fortress AI — Master Section Registry (TDD §9, ADR-004)
 * Curated catalogue of 20 production section variants across 8 core section families.
 */

class SectionRegistry {
  private entries: Map<string, SectionRegistryEntry> = new Map();

  constructor() {
    // Headers
    this.register(headerManifest.id, { manifest: headerManifest, component: HeaderSection as any });

    // Heroes
    this.register(heroSplitManifest.id, { manifest: heroSplitManifest, component: HeroSplitSection as any });
    this.register(heroCenteredManifest.id, { manifest: heroCenteredManifest, component: HeroCenteredSection as any });
    this.register(heroLeadFormManifest.id, { manifest: heroLeadFormManifest, component: HeroLeadFormSection as any });
    this.register(heroEditorialManifest.id, { manifest: heroEditorialManifest, component: HeroEditorialSection as any });

    // Services
    this.register(servicesCardGridManifest.id, { manifest: servicesCardGridManifest, component: ServicesCardGridSection as any });
    this.register(servicesAlternatingManifest.id, { manifest: servicesAlternatingManifest, component: ServicesAlternatingSection as any });
    this.register(servicesListManifest.id, { manifest: servicesListManifest, component: ServicesListSection as any });
    this.register(servicesPricingManifest.id, { manifest: servicesPricingManifest, component: ServicesPricingSection as any });

    // About & Brand Narrative
    this.register(aboutStoryManifest.id, { manifest: aboutStoryManifest, component: AboutStorySection as any });
    this.register(aboutValuesManifest.id, { manifest: aboutValuesManifest, component: AboutValuesSection as any });
    this.register(aboutTeamManifest.id, { manifest: aboutTeamManifest, component: AboutTeamSection as any });

    // Social Proof & Trust
    this.register(proofMetricsManifest.id, { manifest: proofMetricsManifest, component: ProofMetricsSection as any });
    this.register(proofTestimonialsManifest.id, { manifest: proofTestimonialsManifest, component: ProofTestimonialsSection as any });

    // FAQs
    this.register(faqAccordionManifest.id, { manifest: faqAccordionManifest, component: FaqAccordionSection as any });

    // CTAs
    this.register(ctaFullwidthManifest.id, { manifest: ctaFullwidthManifest, component: CtaFullwidthSection as any });

    // Contact
    this.register(contactSplitManifest.id, { manifest: contactSplitManifest, component: ContactSplitSection as any });

    // Blog
    this.register(blogIndexManifest.id, { manifest: blogIndexManifest, component: BlogIndexSection as any });

    // Footers
    this.register(footerManifest.id, { manifest: footerManifest, component: FooterSection as any });
    this.register(footerMinimalManifest.id, { manifest: footerMinimalManifest, component: FooterMinimalSection as any });
  }

  register(id: string, entry: SectionRegistryEntry): void {
    this.entries.set(id, entry);
  }

  getEntry(id: string): SectionRegistryEntry {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new ManifestNotFoundError(id, "latest");
    }
    return entry;
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  listManifests() {
    return Array.from(this.entries.values()).map((e) => e.manifest);
  }
}

export const sectionRegistry = new SectionRegistry();
