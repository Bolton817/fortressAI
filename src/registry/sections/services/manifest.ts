import { SectionManifest } from "@/core/schema/manifest";

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
