import { describe, it, expect } from "vitest";
import { compileSiteHtml } from "@/core/export/export-compiler";
import { maraHorizonConfig } from "@/db/seed-data";

describe("Phase 8: Production Hardening — Performance Benchmarks & Core Web Vitals (TDD §31.1, §31.2)", () => {
  it("enforces strict static asset payload budgets", () => {
    const compiled = compileSiteHtml(maraHorizonConfig);

    // 1. HTML route budgets (<= 50 KB)
    const htmlFiles = compiled.files.filter((f) => f.path.endsWith(".html"));
    expect(htmlFiles.length).toBeGreaterThan(0);

    for (const file of htmlFiles) {
      const htmlSizeKb = (Buffer.isBuffer(file.content) ? file.content.length : Buffer.byteLength(file.content, "utf-8")) / 1024;
      expect(htmlSizeKb).toBeLessThan(50);
    }

    // 2. CSS stylesheet budget (<= 30 KB)
    const cssFile = compiled.files.find((f) => f.path === "assets/style.css")!;
    expect(cssFile).toBeDefined();
    const cssSizeKb = (Buffer.isBuffer(cssFile.content) ? cssFile.content.length : Buffer.byteLength(cssFile.content, "utf-8")) / 1024;
    expect(cssSizeKb).toBeLessThan(30);

    // 3. Client JavaScript budget (<= 15 KB)
    const jsFile = compiled.files.find((f) => f.path === "assets/app.js")!;
    expect(jsFile).toBeDefined();
    const jsSizeKb = (Buffer.isBuffer(jsFile.content) ? jsFile.content.length : Buffer.byteLength(jsFile.content, "utf-8")) / 1024;
    expect(jsSizeKb).toBeLessThan(15);
  });

  it("verifies mobile responsive CSS breakpoints and zero layout shift styling", () => {
    const compiled = compileSiteHtml(maraHorizonConfig);
    const cssFile = compiled.files.find((f) => f.path === "assets/style.css")!;
    const css = typeof cssFile.content === "string" ? cssFile.content : cssFile.content.toString("utf-8");

    // Mobile media queries
    expect(css).toContain("@media (max-width: 768px)");
    expect(css).toContain("grid-template-columns: 1fr");

    // Layout stability rules: images have max-width: 100% and height: auto
    expect(css).toContain("max-width: 100%");
    expect(css).toContain("height: auto");
  });

  it("executes multi-route static site compilation in under 500ms", () => {
    const start = Date.now();
    const compiled = compileSiteHtml(maraHorizonConfig);
    const durationMs = Date.now() - start;

    expect(durationMs).toBeLessThan(500);
    expect(compiled.routes.length).toBeGreaterThanOrEqual(1);
  });
});
