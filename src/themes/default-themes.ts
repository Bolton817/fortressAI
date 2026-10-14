import { ThemeDefinition } from "@/core/schema/tokens";

/**
 * Fortress AI — Starter Production Themes (TDD §10, §40.2)
 * Pure token definitions adhering strictly to the ThemeDefinition schema.
 */

export const warmEditorialTheme: ThemeDefinition = {
  id: "warm-editorial",
  name: "Warm Editorial",
  version: "1.0.0",
  tokens: {
    colors: {
      primary: "#174A50",
      secondary: "#2E6168",
      accent: "#D6A24A",
      background: "#FAF8F3",
      surface: "#FFFFFF",
      text: "#1D2A2A",
      muted: "#586766",
      border: "#E2DDD3",
    },
    typography: {
      display: "Georgia, 'Times New Roman', serif",
      body: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      displayWeight: "700",
      bodyWeight: "400",
    },
    spacing: {
      sectionDesktop: "5rem",
      sectionMobile: "3rem",
      containerWidth: "1280px",
      cardGap: "1.5rem",
    },
    shape: {
      cardRadius: "1rem",
      buttonRadius: "0.5rem",
      shadowLevel: "sm",
    },
    motion: {
      preset: "subtle",
      reducedMotion: "static",
    },
  },
  contrastChecks: "required",
  fontAssets: "self-hosted-or-approved",
  description: "Sophisticated warm tones suited for hospitality, tourism, and editorial brands.",
};

export const modernSlateTheme: ThemeDefinition = {
  id: "modern-slate",
  name: "Modern Slate",
  version: "1.0.0",
  tokens: {
    colors: {
      primary: "#0F172A",
      secondary: "#334155",
      accent: "#2563EB",
      background: "#F8FAFC",
      surface: "#FFFFFF",
      text: "#0F172A",
      muted: "#64748B",
      border: "#E2E8F0",
    },
    typography: {
      display: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      body: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      displayWeight: "700",
      bodyWeight: "400",
    },
    spacing: {
      sectionDesktop: "5rem",
      sectionMobile: "3rem",
      containerWidth: "1280px",
      cardGap: "1.5rem",
    },
    shape: {
      cardRadius: "0.5rem",
      buttonRadius: "0.375rem",
      shadowLevel: "md",
    },
    motion: {
      preset: "subtle",
      reducedMotion: "static",
    },
  },
  contrastChecks: "required",
  fontAssets: "self-hosted-or-approved",
  description: "Crisp, clean contemporary theme for consulting, technology, and professional services.",
};

export const defaultThemes: Record<string, ThemeDefinition> = {
  [warmEditorialTheme.id]: warmEditorialTheme,
  [modernSlateTheme.id]: modernSlateTheme,
};

export function resolveTheme(themeId: string, overrides?: Record<string, any>): ThemeDefinition {
  const base = defaultThemes[themeId] || warmEditorialTheme;
  if (!overrides) return base;
  return {
    ...base,
    tokens: {
      ...base.tokens,
      colors: { ...base.tokens.colors, ...(overrides.colors || {}) },
      typography: { ...base.tokens.typography, ...(overrides.typography || {}) },
      spacing: { ...base.tokens.spacing, ...(overrides.spacing || {}) },
      shape: { ...base.tokens.shape, ...(overrides.shape || {}) },
      motion: { ...base.tokens.motion, ...(overrides.motion || {}) },
    },
  };
}

/**
 * Converts ThemeTokens into a CSS Variables dictionary suitable for inline style injection
 */
export function themeTokensToCssVariables(theme: ThemeDefinition): Record<string, string> {
  const { colors, typography, spacing, shape } = theme.tokens;
  return {
    "--theme-primary": colors.primary,
    "--theme-secondary": colors.secondary,
    "--theme-accent": colors.accent,
    "--theme-bg": colors.background,
    "--theme-surface": colors.surface,
    "--theme-text": colors.text,
    "--theme-muted": colors.muted,
    "--theme-border": colors.border || "#E2E8F0",
    "--theme-font-display": typography.display,
    "--theme-font-body": typography.body,
    "--theme-radius-card": shape.cardRadius,
    "--theme-radius-btn": shape.buttonRadius,
    "--theme-spacing-desktop": spacing.sectionDesktop,
    "--theme-spacing-mobile": spacing.sectionMobile,
    "--theme-container-width": spacing.containerWidth,
  };
}
