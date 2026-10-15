import { describe, it, expect, beforeEach } from "vitest";
import { compileSiteHtml } from "@/core/export/export-compiler";
import { bundleSiteAssets } from "@/core/export/asset-bundler";
import { buildZipArchive, extractZipArchive } from "@/core/export/package-bundler";
import { generateDeploymentConfigs } from "@/core/export/deployment-guides";
import { tenantRepository } from "@/db/tenant-repository";
import { seedPhase0Tenants, USER_A_ID, SITE_A_ID } from "@/db/seed-data";

describe("Phase 7: Static Site Export & Package Bundler (TDD §21.1–§21.5, FR-080)", () => {
  beforeEach(async () => {
    seedPhase0Tenants();
  });

  it("compiles all canonical page routes into standalone HTML documents", async () => {
    const config = await tenantRepository.getDraftConfiguration({ userId: USER_A_ID }, SITE_A_ID);
    const { files, routes } = compileSiteHtml(config);

    expect(routes).toContain("/");

    const indexHtml = files.find((f) => f.path === "index.html");
    expect(indexHtml).toBeDefined();
    expect(typeof indexHtml!.content).toBe("string");
    const content = indexHtml!.content as string;

    // Head metadata
    expect(content).toContain("<!DOCTYPE html>");
    expect(content).toContain("<title>");
    expect(content).toContain('<meta name="viewport"');
    expect(content).toContain('<link rel="canonical"');
    expect(content).toContain('<meta property="og:title"');
    expect(content).toContain('<link rel="stylesheet" href="./assets/style.css"');
    expect(content).toContain('<script src="./assets/app.js"></script>');

    // Section rendering
    expect(content).toContain("header-bar");
    expect(content).toContain("hero-h1");
    expect(content).toContain("footer-section");
  });

  it("generates sitemap.xml and robots.txt referencing canonical URLs", async () => {
    const config = await tenantRepository.getDraftConfiguration({ userId: USER_A_ID }, SITE_A_ID);
    const { files } = compileSiteHtml(config);

    const sitemap = files.find((f) => f.path === "sitemap.xml");
    expect(sitemap).toBeDefined();
    const sitemapStr = sitemap!.content as string;
    expect(sitemapStr).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(sitemapStr).toContain("<urlset");
    expect(sitemapStr).toContain(`https://${config.platformSlug}.fortress-ai.com`);

    const robots = files.find((f) => f.path === "robots.txt");
    expect(robots).toBeDefined();
    const robotsStr = robots!.content as string;
    expect(robotsStr).toContain("User-agent: *");
    expect(robotsStr).toContain(`Sitemap: https://${config.platformSlug}.fortress-ai.com/sitemap.xml`);
  });

  it("resolves media assets, validates licensing rights, and bundles local placeholders", async () => {
    const config = await tenantRepository.getDraftConfiguration({ userId: USER_A_ID }, SITE_A_ID);
    const { assetFiles, assetManifest, assetsCount } = bundleSiteAssets(config);

    expect(assetFiles.length).toBeGreaterThan(0);
    expect(assetsCount).toBeGreaterThanOrEqual(1);

    // Verify assets-manifest.json
    const manifestFile = assetFiles.find((f) => f.path === "assets-manifest.json");
    expect(manifestFile).toBeDefined();
    const manifestJson = JSON.parse(manifestFile!.content.toString());
    expect(manifestJson.siteId).toBe(config.siteId);
    expect(Array.isArray(manifestJson.assets)).toBe(true);

    // Verify placeholder SVG exists
    const placeholder = assetFiles.find((f) => f.path === "assets/images/placeholder.svg");
    expect(placeholder).toBeDefined();
    expect(placeholder!.content.toString()).toContain("<svg");
  });

  it("generates deployment configs for Netlify, Vercel, Cloudflare, GitHub Pages, and Nginx", async () => {
    const config = await tenantRepository.getDraftConfiguration({ userId: USER_A_ID }, SITE_A_ID);
    const routes = config.pages.map((p) => p.slug);
    const configs = generateDeploymentConfigs(config, routes);

    const paths = configs.map((c) => c.path);
    expect(paths).toContain("_redirects");
    expect(paths).toContain("netlify.toml");
    expect(paths).toContain("vercel.json");
    expect(paths).toContain("_headers");
    expect(paths).toContain(".nojekyll");
    expect(paths).toContain(".htaccess");
    expect(paths).toContain("nginx.conf");
    expect(paths).toContain("README.md");

    const vercel = configs.find((c) => c.path === "vercel.json");
    const vercelObj = JSON.parse(vercel!.content as string);
    expect(vercelObj.cleanUrls).toBe(true);

    const netlify = configs.find((c) => c.path === "netlify.toml");
    expect(netlify!.content).toContain('publish = "."');
  });

  it("packs files into a compliant PKWARE ZIP and unpacks them with bit-for-bit fidelity", async () => {
    const testFiles = [
      { path: "index.html", content: "<html><body><h1>Hello World</h1></body></html>" },
      { path: "assets/style.css", content: "body { background: #fff; color: #000; }" },
      { path: "assets/data.json", content: JSON.stringify({ key: "value", numbers: [1, 2, 3] }) },
      { path: "binary.bin", content: Buffer.from([0x00, 0xff, 0xaa, 0x55, 0x12, 0x34]) },
    ];

    const { buffer: zipBuffer, sha256, sizeBytes, fileCount } = buildZipArchive(testFiles);

    expect(zipBuffer.length).toBeGreaterThan(100);
    expect(sha256).toHaveLength(64); // SHA-256 hex
    expect(sizeBytes).toBe(zipBuffer.length);
    expect(fileCount).toBe(4);

    // Verify PK signature
    expect(zipBuffer.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));

    // Unpack with extractZipArchive
    const extracted = extractZipArchive(zipBuffer);
    expect(extracted.size).toBe(4);
    expect(extracted.get("index.html")?.toString("utf-8")).toBe(testFiles[0].content);
    expect(extracted.get("assets/style.css")?.toString("utf-8")).toBe(testFiles[1].content);
    expect(extracted.get("assets/data.json")?.toString("utf-8")).toBe(testFiles[2].content);
    expect(extracted.get("binary.bin")).toEqual(testFiles[3].content);
  });
});
