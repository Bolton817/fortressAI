import { SiteConfiguration } from "@/core/schema/site-config";
import { ExportOutputFile } from "./types";
import fs from "fs";
import path from "path";

/**
 * Fortress AI — Asset Resolver & License Bundler (TDD §21.5, §31.1, FR-080)
 * Resolves media references, validates export rights, generates local asset copies,
 * and produces the machine-readable assets-manifest.json.
 */

export interface BundledAssetInfo {
  assetId: string;
  slotId: string;
  originalUrl: string;
  localPath: string;
  licenceValidated: boolean;
  exportPermitted: boolean;
  mode: "local-copy" | "remote-cdn" | "placeholder";
  altText: string;
  mimeType: string;
}

export function bundleSiteAssets(
  config: SiteConfiguration,
  options: { uploadsDir?: string } = {}
): {
  assetFiles: ExportOutputFile[];
  assetManifest: BundledAssetInfo[];
  assetsCount: number;
} {
  const assetFiles: ExportOutputFile[] = [];
  const assetManifest: BundledAssetInfo[] = [];
  const seenAssetIds = new Set<string>();

  const uploadsDir = options.uploadsDir || path.join(process.cwd(), ".data", "uploads");

  // Traverse all sections in all pages
  for (const page of config.pages) {
    for (const section of page.sections) {
      if (!section.assetBindings || section.assetBindings.length === 0) continue;

      for (const binding of section.assetBindings) {
        if (seenAssetIds.has(binding.assetId)) continue;
        seenAssetIds.add(binding.assetId);

        const licenceValidated = binding.licenceType !== "unlicensed" && binding.exportPermitted !== false;
        const exportPermitted = binding.exportPermitted !== false;

        // Determine filename
        const ext = getExtensionFromUrl(binding.url) || ".jpg";
        const cleanName = `${binding.assetId.replace(/[^a-zA-Z0-9_-]/g, "_")}${ext}`;
        const relativeLocalPath = `assets/images/${cleanName}`;

        let assetContent: Buffer | null = null;
        let mode: "local-copy" | "remote-cdn" | "placeholder" = "placeholder";

        // Check if file exists locally in uploads
        const localDiskPath = options.uploadsDir
          ? path.join(/* turbopackIgnore: true */ options.uploadsDir, cleanName)
          : path.join(process.cwd(), ".data", "uploads", cleanName);
        if (fs.existsSync(/* turbopackIgnore: true */ localDiskPath)) {
          try {
            assetContent = fs.readFileSync(/* turbopackIgnore: true */ localDiskPath);
            mode = "local-copy";
          } catch {
            assetContent = null;
          }
        }

        // If not found locally, create a responsive SVG placeholder so the export package is 100% self-contained
        if (!assetContent) {
          assetContent = Buffer.from(
            generatePlaceholderSvg(binding.altText || config.businessProfile.name, binding.width || 800, binding.height || 600)
          );
          mode = "placeholder";
        }

        assetFiles.push({
          path: relativeLocalPath,
          content: assetContent,
          contentType: getMimeType(cleanName),
        });

        assetManifest.push({
          assetId: binding.assetId,
          slotId: binding.slotId,
          originalUrl: binding.url,
          localPath: relativeLocalPath,
          licenceValidated,
          exportPermitted,
          mode,
          altText: binding.altText || "",
          mimeType: getMimeType(cleanName),
        });
      }
    }
  }

  // Always generate a default brand placeholder for fallback
  const defaultPlaceholderSvg = generatePlaceholderSvg(config.businessProfile.name, 1200, 675);
  assetFiles.push({
    path: "assets/images/placeholder.svg",
    content: defaultPlaceholderSvg,
    contentType: "image/svg+xml",
  });

  // Generate assets-manifest.json
  assetFiles.push({
    path: "assets-manifest.json",
    content: JSON.stringify(
      {
        siteId: config.siteId,
        generatedAt: new Date().toISOString(),
        totalAssets: assetManifest.length,
        assets: assetManifest,
      },
      null,
      2
    ),
    contentType: "application/json",
  });

  return {
    assetFiles,
    assetManifest,
    assetsCount: assetManifest.length,
  };
}

function getExtensionFromUrl(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    const pathname = url.pathname;
    const match = pathname.match(/\.[a-zA-Z0-9]+$/);
    return match ? match[0].toLowerCase() : ".jpg";
  } catch {
    const match = urlStr.match(/\.[a-zA-Z0-9]+$/);
    return match ? match[0].toLowerCase() : ".jpg";
  }
}

function getMimeType(filename: string): string {
  if (filename.endsWith(".png")) return "image/png";
  if (filename.endsWith(".webp")) return "image/webp";
  if (filename.endsWith(".svg")) return "image/svg+xml";
  if (filename.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

function generatePlaceholderSvg(label: string, width: number, height: number): string {
  const safeLabel = (label || "Fortress AI Media").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#grad)" />
  <rect x="20" y="20" width="${width - 40}" height="${height - 40}" fill="none" stroke="#d6a24a" stroke-width="2" stroke-dasharray="8 8" rx="12" opacity="0.4" />
  <text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-size="24" font-weight="bold">${safeLabel}</text>
  <text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="14">Fortress AI Static Asset Placeholder</text>
</svg>`;
}
