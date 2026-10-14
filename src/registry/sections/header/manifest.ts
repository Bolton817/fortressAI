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
