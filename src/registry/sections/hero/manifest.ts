import { SectionManifest } from "@/core/schema/manifest";

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
