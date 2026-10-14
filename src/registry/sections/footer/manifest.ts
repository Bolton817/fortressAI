import { SectionManifest } from "@/core/schema/manifest";

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
