import { describe, it, expect } from "vitest";
import { defaultThemes, validateThemeContrast } from "@/themes/default-themes";

describe("Phase 1 — Theme Catalogue & WCAG 2.2 AA Contrast (TDD §10, FR-019)", () => {
  it("provides 6 distinct production themes", () => {
    const keys = Object.keys(defaultThemes);
    expect(keys.length).toBe(6);
    expect(keys).toContain("warm-editorial");
    expect(keys).toContain("modern-slate");
    expect(keys).toContain("bold-craft");
    expect(keys).toContain("vibrant-pulse");
    expect(keys).toContain("ocean-minimal");
    expect(keys).toContain("nordic-clean");
  });

  it("passes WCAG 2.2 AA contrast checks on all 6 themes", () => {
    for (const [id, theme] of Object.entries(defaultThemes)) {
      const result = validateThemeContrast(theme);
      expect(result.passed, `Theme ${id} failed contrast checks: ${JSON.stringify(result.reports)}`).toBe(true);
      for (const report of result.reports) {
        expect(report.ratio).toBeGreaterThanOrEqual(3.0);
      }
    }
  });
});
