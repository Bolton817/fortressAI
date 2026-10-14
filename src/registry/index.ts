import { SectionRegistryEntry } from "./types";
import { headerManifest } from "./sections/header/manifest";
import { HeaderSection } from "./sections/header/component";
import { heroSplitManifest } from "./sections/hero/manifest";
import { HeroSplitSection } from "./sections/hero/component";
import { servicesCardGridManifest } from "./sections/services/manifest";
import { ServicesCardGridSection } from "./sections/services/component";
import { aboutStoryManifest } from "./sections/about/manifest";
import { AboutStorySection } from "./sections/about/component";
import { footerManifest } from "./sections/footer/manifest";
import { FooterSection } from "./sections/footer/component";
import { ManifestNotFoundError } from "@/core/errors";

/**
 * Fortress AI — Section Registry (TDD §9, ADR-004)
 * The single version-controlled repository of approved section components and manifests.
 * Invariant: Runtime composition and rendering accept ONLY registered component IDs.
 */

class SectionRegistry {
  private entries: Map<string, SectionRegistryEntry> = new Map();

  constructor() {
    this.register(headerManifest.id, { manifest: headerManifest, component: HeaderSection });
    this.register(heroSplitManifest.id, { manifest: heroSplitManifest, component: HeroSplitSection });
    this.register(servicesCardGridManifest.id, { manifest: servicesCardGridManifest, component: ServicesCardGridSection });
    this.register(aboutStoryManifest.id, { manifest: aboutStoryManifest, component: AboutStorySection });
    this.register(footerManifest.id, { manifest: footerManifest, component: FooterSection });
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
export * from "./types";
