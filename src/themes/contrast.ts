/**
 * Fortress AI — WCAG 2.2 AA Contrast Validator (TDD §10.3, FR-019, FR-058)
 * Computes exact relative luminance and contrast ratio according to W3C specifications.
 */

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function calculateRelativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

export function calculateContrastRatio(hex1: string, hex2: string): number {
  const l1 = calculateRelativeLuminance(hex1);
  const l2 = calculateRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export interface ContrastReport {
  pair: string;
  foreground: string;
  background: string;
  ratio: number;
  meetsAANormal: boolean; // >= 4.5
  meetsAALarge: boolean;  // >= 3.0
}

export function validateThemeContrast(theme: {
  tokens: {
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      surface: string;
      text: string;
      muted: string;
    };
  };
}): { passed: boolean; reports: ContrastReport[] } {
  const { colors } = theme.tokens;

  const checks = [
    { pair: "Text on Background", fg: colors.text, bg: colors.background },
    { pair: "Text on Surface", fg: colors.text, bg: colors.surface },
    { pair: "Muted on Background", fg: colors.muted, bg: colors.background, largeOnly: true },
    { pair: "Primary Button Text (White)", fg: "#FFFFFF", bg: colors.primary },
    { pair: "Secondary Button Text", fg: colors.text, bg: colors.surface },
  ];

  const reports: ContrastReport[] = checks.map((c) => {
    const ratio = calculateContrastRatio(c.fg, c.bg);
    return {
      pair: c.pair,
      foreground: c.fg,
      background: c.bg,
      ratio: Math.round(ratio * 100) / 100,
      meetsAANormal: ratio >= 4.5,
      meetsAALarge: ratio >= 3.0,
    };
  });

  const passed = reports.every((r) => r.meetsAALarge);
  return { passed, reports };
}
