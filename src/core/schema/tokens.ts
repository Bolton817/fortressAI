import { z } from "zod";

/**
 * Fortress AI — Theme Tokens Schema (TDD §10, §40.2)
 * Pure typed contract for visual styling via CSS variables.
 * Invariant: AI models can only select or adjust supported tokens within bounds; no arbitrary CSS injection.
 */

export const ColorTokensSchema = z.object({
  primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a 6-digit hex color"),
  secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a 6-digit hex color"),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a 6-digit hex color"),
  background: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a 6-digit hex color"),
  surface: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a 6-digit hex color"),
  text: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a 6-digit hex color"),
  muted: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a 6-digit hex color"),
  border: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a 6-digit hex color").optional(),
});

export const TypographyTokensSchema = z.object({
  display: z.string().min(1, "Display font family required"),
  body: z.string().min(1, "Body font family required"),
  displayWeight: z.string().default("700"),
  bodyWeight: z.string().default("400"),
});

export const SpacingTokensSchema = z.object({
  sectionDesktop: z.string().default("5rem"),
  sectionMobile: z.string().default("3rem"),
  containerWidth: z.string().default("1280px"),
  cardGap: z.string().default("1.5rem"),
});

export const ShapeTokensSchema = z.object({
  cardRadius: z.string().default("0.75rem"),
  buttonRadius: z.string().default("0.5rem"),
  shadowLevel: z.enum(["none", "sm", "md", "lg"]).default("sm"),
});

export const MotionTokensSchema = z.object({
  preset: z.enum(["none", "subtle", "expressive"]).default("subtle"),
  reducedMotion: z.enum(["static", "reduced"]).default("static"),
});

export const ThemeDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().default("1.0.0"),
  tokens: z.object({
    colors: ColorTokensSchema,
    typography: TypographyTokensSchema,
    spacing: SpacingTokensSchema,
    shape: ShapeTokensSchema,
    motion: MotionTokensSchema,
  }),
  contrastChecks: z.literal("required").default("required"),
  fontAssets: z.string().default("self-hosted-or-approved"),
  description: z.string().optional(),
});

export type ThemeTokens = z.infer<typeof ThemeDefinitionSchema>["tokens"];
export type ThemeDefinition = z.infer<typeof ThemeDefinitionSchema>;
