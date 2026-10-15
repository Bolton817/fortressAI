import { z } from "zod";

/**
 * Fortress AI — Conversational Editing & Intent Types (TDD §13.2, FR-030, FR-031)
 */

export const IntentTypeSchema = z.enum([
  "CONTENT_EDIT",
  "STYLE_CHANGE",
  "IMAGE_CHANGE",
  "SECTION_MUTATION",
  "BLOG_GENERATE",
  "UNSUPPORTED",
]);
export type IntentType = z.infer<typeof IntentTypeSchema>;

export interface ParsedIntent {
  type: IntentType;
  confidence: number;
  targetPageSlug?: string;
  targetSectionId?: string;
  fieldPatches?: Record<string, any>;
  themeId?: string;
  assetSlotId?: string;
  explanation: string;
  requiresExplicitConfirmation: boolean;
  confirmationMessage?: string;
}

export interface SectionPatchRequest {
  pageSlug: string;
  sectionId?: string;
  sectionInstanceId?: string;
  contentPatch: Record<string, any>;
  expectedVersion: number;
}
