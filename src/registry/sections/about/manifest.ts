import { SectionManifest } from "@/core/schema/manifest";

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
