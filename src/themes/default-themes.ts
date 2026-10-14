import { ThemeDefinition } from "@/core/schema/tokens";
import { validateThemeContrast } from "./contrast";

/**
 * Fortress AI — 6 Core Production Themes (TDD §10, §40.2, FR-019)
 * Pre-validated for WCAG 2.2 AA contrast, fluid typography, and responsive spacing.
 */

export const warmEditorialTheme: ThemeDefinition = {
  id: "warm-editorial",
  name: "Warm Editorial",
  version: "1.0.0",
  tokens: {
    colors: {
      primary: "#174A50",
      secondary: "#2E6168",
      accent: "#B8860B",
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
      muted: "#475569",
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

export const boldCraftTheme: ThemeDefinition = {
  id: "bold-craft",
  name: "Bold Craft",
  version: "1.0.0",
  tokens: {
    colors: {
      primary: "#1C1917",
      secondary: "#44403C",
      accent: "#D97706",
      background: "#F5F5F4",
      surface: "#FFFFFF",
      text: "#1C1917",
      muted: "#57534E",
      border: "#E7E5E4",
    },
    typography: {
      display: "Impact, 'Arial Black', system-ui, sans-serif",
      body: "system-ui, -apple-system, sans-serif",
      displayWeight: "800",
      bodyWeight: "400",
    },
    spacing: {
      sectionDesktop: "5.5rem",
      sectionMobile: "3.5rem",
      containerWidth: "1280px",
      cardGap: "1.75rem",
    },
    shape: {
      cardRadius: "0.25rem",
      buttonRadius: "0.25rem",
      shadowLevel: "none",
    },
    motion: {
      preset: "subtle",
      reducedMotion: "static",
    },
  },
  contrastChecks: "required",
  fontAssets: "self-hosted-or-approved",
  description: "High-contrast architectural design for trades, builders, craftsmanship, and artisanal industries.",
};

export const vibrantPulseTheme: ThemeDefinition = {
  id: "vibrant-pulse",
  name: "Vibrant Pulse",
  version: "1.0.0",
  tokens: {
    colors: {
      primary: "#1E1B4B",
      secondary: "#312E81",
      accent: "#4F46E5",
      background: "#FAF5FF",
      surface: "#FFFFFF",
      text: "#1E1B4B",
      muted: "#475569",
      border: "#E0E7FF",
    },
    typography: {
      display: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      body: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      displayWeight: "800",
      bodyWeight: "400",
    },
    spacing: {
      sectionDesktop: "5rem",
      sectionMobile: "3rem",
      containerWidth: "1280px",
      cardGap: "1.5rem",
    },
    shape: {
      cardRadius: "1.25rem",
      buttonRadius: "9999px",
      shadowLevel: "lg",
    },
    motion: {
      preset: "expressive",
      reducedMotion: "static",
    },
  },
  contrastChecks: "required",
  fontAssets: "self-hosted-or-approved",
  description: "Dynamic and expressive aesthetic for creative agencies, media studios, and digital brands.",
};

export const oceanMinimalTheme: ThemeDefinition = {
  id: "ocean-minimal",
  name: "Ocean Minimal",
  version: "1.0.0",
  tokens: {
    colors: {
      primary: "#082F49",
      secondary: "#0369A1",
      accent: "#0D9488",
      background: "#F0FDF4",
      surface: "#FFFFFF",
      text: "#0F172A",
      muted: "#475569",
      border: "#CCFBF1",
    },
    typography: {
      display: "system-ui, -apple-system, sans-serif",
      body: "system-ui, -apple-system, sans-serif",
      displayWeight: "600",
      bodyWeight: "400",
    },
    spacing: {
      sectionDesktop: "4.5rem",
      sectionMobile: "2.5rem",
      containerWidth: "1200px",
      cardGap: "1.25rem",
    },
    shape: {
      cardRadius: "0.75rem",
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
  description: "Tranquil marine palette ideal for wellness, medical clinics, environmental, and legal services.",
};

export const nordicCleanTheme: ThemeDefinition = {
  id: "nordic-clean",
  name: "Nordic Clean",
  version: "1.0.0",
  tokens: {
    colors: {
      primary: "#18181B",
      secondary: "#27272A",
      accent: "#059669",
      background: "#FAFAFA",
      surface: "#FFFFFF",
      text: "#18181B",
      muted: "#52525B",
      border: "#E4E4E7",
    },
    typography: {
      display: "system-ui, -apple-system, sans-serif",
      body: "system-ui, -apple-system, sans-serif",
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
      cardRadius: "0.375rem",
      buttonRadius: "0.25rem",
      shadowLevel: "sm",
    },
    motion: {
      preset: "subtle",
      reducedMotion: "static",
    },
  },
  contrastChecks: "required",
  fontAssets: "self-hosted-or-approved",
  description: "Minimalist, restrained Scandinavian design suited for architects, designers, and high-end retail.",
};

export const defaultThemes: Record<string, ThemeDefinition> = {
  [warmEditorialTheme.id]: warmEditorialTheme,
  [modernSlateTheme.id]: modernSlateTheme,
  [boldCraftTheme.id]: boldCraftTheme,
  [vibrantPulseTheme.id]: vibrantPulseTheme,
  [oceanMinimalTheme.id]: oceanMinimalTheme,
  [nordicCleanTheme.id]: nordicCleanTheme,
};

export function resolveTheme(themeId: string, overrides?: Record<string, unknown>): ThemeDefinition {
  const base = defaultThemes[themeId] || warmEditorialTheme;
  if (!overrides) return base;
  return {
    ...base,
    tokens: {
      ...base.tokens,
      colors: { ...base.tokens.colors, ...((overrides.colors as any) || {}) },
      typography: { ...base.tokens.typography, ...((overrides.typography as any) || {}) },
      spacing: { ...base.tokens.spacing, ...((overrides.spacing as any) || {}) },
      shape: { ...base.tokens.shape, ...((overrides.shape as any) || {}) },
      motion: { ...base.tokens.motion, ...((overrides.motion as any) || {}) },
    },
  };
}

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
    // Fluid responsive typography clamps
    "--theme-text-h1": "clamp(2.25rem, 4vw + 1rem, 3.75rem)",
    "--theme-text-h2": "clamp(1.75rem, 2.5vw + 0.75rem, 2.5rem)",
    "--theme-text-h3": "clamp(1.25rem, 1.5vw + 0.5rem, 1.75rem)",
    "--theme-text-body": "clamp(1rem, 0.5vw + 0.875rem, 1.125rem)",
  };
}

export { validateThemeContrast };
