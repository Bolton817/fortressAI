import { z } from "zod";

/**
 * Fortress AI — Section Manifest Contract (TDD §9.2, §40.1)
 * The authoritative contract between design system engineers, AI prompt engines,
 * the shared renderer, and the static export compiler.
 */

export const PageTypeSchema = z.enum(["home", "about", "services", "blog", "contact"]);
export type PageType = z.infer<typeof PageTypeSchema>;

export const MediaSlotDefinitionSchema = z.object({
  slotId: z.string(),
  required: z.boolean().default(false),
  aspectRatio: z.string(), // e.g., "16:9", "1:1", "4:3"
  acceptedSubjectTags: z.array(z.string()).default([]),
  focalRules: z.string().optional(),
  description: z.string().optional(),
});
export type MediaSlotDefinition = z.infer<typeof MediaSlotDefinitionSchema>;

export const AnimationPresetSchema = z.enum([
  "fade-up",
  "stagger-cards",
  "image-reveal",
  "hero-crossfade",
  "subtle-parallax",
  "count-up",
  "micro-interaction",
]);
export type AnimationPreset = z.infer<typeof AnimationPresetSchema>;

export const AccessibilityContractSchema = z.object({
  semanticHeadingLevel: z.boolean().default(true),
  semanticList: z.boolean().optional(),
  focusVisible: z.boolean().default(true),
  reducedMotionFallback: z.boolean().default(true),
  notes: z.string().optional(),
});

export const ExportCapabilitySchema = z.object({
  staticSafe: z.boolean().default(true),
  dependencies: z.array(z.string()).default([]), // e.g. ["contact-form-api"]
});

export const SectionManifestSchema = z.object({
  id: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Must be semantic version (e.g. 1.0.0)"),
  label: z.string().min(1),
  description: z.string(),
  pageTypes: z.array(PageTypeSchema).min(1),
  industries: z.array(z.string()).default(["general"]),
  layoutType: z.string(),
  contentSchemaVersion: z.string(),
  mediaSlots: z.array(MediaSlotDefinitionSchema).default([]),
  animationPresets: z.array(AnimationPresetSchema).default([]),
  accessibility: AccessibilityContractSchema,
  export: ExportCapabilitySchema,
  status: z.enum(["draft", "in_review", "released", "deprecated", "retired"]).default("released"),
});

export type SectionManifest = z.infer<typeof SectionManifestSchema>;
