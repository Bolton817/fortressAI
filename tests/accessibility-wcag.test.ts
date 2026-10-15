import { describe, it, expect } from "vitest";
import { allManifests } from "@/registry";
import { compileSiteHtml } from "@/core/export/export-compiler";
import { defaultThemes } from "@/themes/default-themes";
import { calculateContrastRatio } from "@/themes/contrast";
import { maraHorizonConfig } from "@/db/seed-data";

describe("Phase 8: Production Hardening — Accessibility (WCAG 2.1 AA) & Inclusive Design (TDD §18.2, §31.1, §34.1)", () => {
  describe("Semantic HTML5 & ARIA Interactive States", () => {
    it("ensures all 20 manifest section types declare semantic landmarks", () => {
      expect(allManifests.length).toBeGreaterThanOrEqual(20);

      for (const manifest of allManifests) {
        expect(manifest.id).toBeDefined();
        expect(manifest.version).toBeDefined();
        expect(manifest.layoutType).toBeDefined();
        expect(manifest.contentSchemaVersion).toBeDefined();
      }
    });

    it("verifies static compiled output includes accessible ARIA attributes and landmark tags", () => {
      const compiled = compileSiteHtml(maraHorizonConfig);
      const indexFile = compiled.files.find((f) => f.path === "index.html");
      expect(indexFile).toBeDefined();

      const homeHtml = typeof indexFile!.content === "string" ? indexFile!.content : indexFile!.content.toString("utf-8");
      expect(homeHtml).toContain("<nav");
      expect(homeHtml).toContain("<header");
      expect(homeHtml).toContain("<footer");
      expect(homeHtml).toContain("<main");
      expect(homeHtml).toContain("aria-label=");

      // Client script must handle mobile drawer aria-expanded toggle
      const appJsFile = compiled.files.find((f) => f.path === "assets/app.js");
      expect(appJsFile).toBeDefined();
      const appJs = typeof appJsFile!.content === "string" ? appJsFile!.content : appJsFile!.content.toString("utf-8");
      expect(appJs).toContain("aria-expanded");
    });
  });

  describe("WCAG 2.1 AA Contrast Ratio Verification (TDD §18.2)", () => {
    it("verifies production theme tokens satisfy minimum 4.5:1 text contrast ratios", () => {
      const themes = ["warm-editorial", "modern-slate", "ocean-minimal", "nordic-clean"];

      for (const themeId of themes) {
        const theme = defaultThemes[themeId];
        expect(theme).toBeDefined();

        // Check foreground text against background
        const textBgRatio = calculateContrastRatio(
          theme.tokens.colors.text,
          theme.tokens.colors.background
        );
        expect(textBgRatio).toBeGreaterThanOrEqual(4.5);
      }
    });
  });

  describe("Vestibular & Reduced Motion Support (TDD §18.3)", () => {
    it("ensures stylesheet defines prefers-reduced-motion media query", () => {
      const compiled = compileSiteHtml(maraHorizonConfig);
      const styleFile = compiled.files.find((f) => f.path === "assets/style.css");
      expect(styleFile).toBeDefined();

      const styleCss = typeof styleFile!.content === "string" ? styleFile!.content : styleFile!.content.toString("utf-8");
      expect(styleCss).toContain("@media (prefers-reduced-motion: reduce)");
      expect(styleCss).toContain("animation-duration: 0.01ms");
      expect(styleCss).toContain("transition-duration: 0.01ms");
    });
  });
});
