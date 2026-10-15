import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { AddressInfo } from "net";
import { exportService } from "@/core/export/export-service";
import { extractZipArchive } from "@/core/export/package-bundler";
import { seedPhase0Tenants, USER_C_ID, SITE_C_ID } from "@/db/seed-data";

describe("Phase 7: Live Static HTTP Server Smoke Test (TDD §21.2 Step 53, §36.1)", () => {
  let server: http.Server;
  let serverBaseUrl: string;
  let extractedFiles: Map<string, Buffer>;

  beforeAll(async () => {
    seedPhase0Tenants();

    // 1. Compile full 5-page static package (bypassing subscription check for isolated test harness)
    const buildResult = await exportService.compileSitePackage(USER_C_ID, SITE_C_ID, {
      bypassEntitlements: true,
    });

    // 2. Unpack the PKWARE ZIP archive using our extractor
    extractedFiles = extractZipArchive(buildResult.zipBuffer);

    // 3. Spin up an independent native Node.js HTTP server mimicking a static host (Netlify / S3 / Nginx)
    server = http.createServer((req, res) => {
      const url = new URL(req.url || "/", `http://${req.headers.host}`);
      let reqPath = url.pathname.replace(/^\//, "");

      if (reqPath === "" || reqPath.endsWith("/")) {
        reqPath += "index.html";
      }

      // Try exact path first
      let fileBuffer = extractedFiles.get(reqPath);

      // Try clean URL resolution (.html fallback)
      if (!fileBuffer && !reqPath.includes(".")) {
        reqPath = `${reqPath}.html`;
        fileBuffer = extractedFiles.get(reqPath);
      }

      if (!fileBuffer) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
        return;
      }

      // Determine content type
      let contentType = "text/plain";
      if (reqPath.endsWith(".html")) contentType = "text/html; charset=utf-8";
      else if (reqPath.endsWith(".css")) contentType = "text/css; charset=utf-8";
      else if (reqPath.endsWith(".js")) contentType = "application/javascript; charset=utf-8";
      else if (reqPath.endsWith(".json")) contentType = "application/json; charset=utf-8";
      else if (reqPath.endsWith(".xml")) contentType = "application/xml; charset=utf-8";
      else if (reqPath.endsWith(".svg")) contentType = "image/svg+xml";
      else if (reqPath.endsWith(".md")) contentType = "text/markdown; charset=utf-8";

      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": fileBuffer.length,
      });
      res.end(fileBuffer);
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address() as AddressInfo;
        serverBaseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("serves root route (index.html) with 200 OK and valid HTML document structure", async () => {
    const res = await fetch(`${serverBaseUrl}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");

    const html = await res.text();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<title>");
    expect(html).toContain("header-bar");
    expect(html).toContain("hero-h1");
    expect(html).toContain("footer-section");
  });

  it("serves secondary pages (/about, /services, /blog, /contact) via clean URLs or .html", async () => {
    const routes = ["/about", "/services", "/blog", "/contact"];

    for (const r of routes) {
      const res = await fetch(`${serverBaseUrl}${r}`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");

      const body = await res.text();
      expect(body).toContain("<!DOCTYPE html>");
    }
  });

  it("serves static assets: pre-compiled CSS and client JS runtime", async () => {
    const cssRes = await fetch(`${serverBaseUrl}/assets/style.css`);
    expect(cssRes.status).toBe(200);
    expect(cssRes.headers.get("content-type")).toContain("text/css");
    const css = await cssRes.text();
    expect(css).toContain(":root");
    expect(css).toContain("--theme-");

    const jsRes = await fetch(`${serverBaseUrl}/assets/app.js`);
    expect(jsRes.status).toBe(200);
    expect(jsRes.headers.get("content-type")).toContain("javascript");
    const js = await jsRes.text();
    expect(js).toContain("mobile-nav");
  });

  it("serves SEO crawler artifacts: sitemap.xml and robots.txt", async () => {
    const sitemapRes = await fetch(`${serverBaseUrl}/sitemap.xml`);
    expect(sitemapRes.status).toBe(200);
    expect(sitemapRes.headers.get("content-type")).toContain("xml");
    const sitemap = await sitemapRes.text();
    expect(sitemap).toContain("<urlset");

    const robotsRes = await fetch(`${serverBaseUrl}/robots.txt`);
    expect(robotsRes.status).toBe(200);
    const robots = await robotsRes.text();
    expect(robots).toContain("User-agent: *");
  });

  it("serves manifest.json and DEPENDENCY_REPORT.md disclosing external dependencies", async () => {
    const manifestRes = await fetch(`${serverBaseUrl}/manifest.json`);
    expect(manifestRes.status).toBe(200);
    const manifest = await manifestRes.json();
    expect(manifest.exportCompilerVersion).toBe("1.0.0");
    expect(manifest.checks.routes).toBe("passed");

    const reportRes = await fetch(`${serverBaseUrl}/DEPENDENCY_REPORT.md`);
    expect(reportRes.status).toBe(200);
    const reportMd = await reportRes.text();
    expect(reportMd).toContain("# Fortress AI — Export Dependency & Compatibility Report");
    expect(reportMd).toContain("contact-form");
  });
});
