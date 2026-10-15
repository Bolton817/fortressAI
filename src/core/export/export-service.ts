import { tenantRepository } from "@/db/tenant-repository";
import { entitlementService } from "@/core/billing/entitlement-service";
import { auditRepository } from "@/db/audit-repository";
import { compileSiteHtml } from "./export-compiler";
import { bundleSiteAssets } from "./asset-bundler";
import { scanExportDependencies } from "./dependency-scanner";
import { generateDeploymentConfigs } from "./deployment-guides";
import { scanFilesForSecrets } from "./secret-scanner";
import { buildZipArchive, extractZipArchive } from "./package-bundler";
import { generateDownloadToken, verifyDownloadToken } from "./export-tokens";
import { ExportOutputFile, ExportManifest, DependencyReport, PackageBuildResult } from "./types";
import fs from "fs";
import path from "path";

/**
 * Fortress AI — Static Export Orchestration Service (TDD §21.1–§21.5, §36.1, FR-080, FR-081, FR-082)
 * Manages the end-to-end static export pipeline: entitlement enforcement, compilation,
 * asset bundling, dependency scanning, secret auditing, ZIP archiving, and secure token delivery.
 */

export interface ExportRequestOptions {
  userId: string;
  siteId: string;
  sourceRevisionOverride?: string;
  baseUrlOverride?: string;
}

export interface ExportInitiateResponse {
  success: boolean;
  exportId: string;
  downloadUrl: string;
  expiresAt: string;
  sha256: string;
  sizeBytes: number;
  fileCount: number;
  manifest: ExportManifest;
  dependencyReport: DependencyReport;
}

export class ExportService {
  private exportsDir: string;

  constructor(customExportsDir?: string) {
    this.exportsDir = customExportsDir || path.join(process.cwd(), ".data", "exports");
    if (!fs.existsSync(this.exportsDir)) {
      fs.mkdirSync(this.exportsDir, { recursive: true });
    }
  }

  /**
   * Previews dependency report for a site without generating a full ZIP package.
   */
  async getPreFlightReport(userId: string, siteId: string): Promise<DependencyReport> {
    await tenantRepository.getSite({ userId }, siteId);
    const config = await tenantRepository.getDraftConfiguration({ userId }, siteId);

    const routes = config.pages.map((p) => p.slug);
    const { assetManifest } = bundleSiteAssets(config);
    const { dependencyReport } = scanExportDependencies(config, routes, assetManifest);

    return dependencyReport;
  }

  /**
   * Builds the static package and returns the archive buffer and manifest.
   */
  async compileSitePackage(userId: string, siteId: string, options: { bypassEntitlements?: boolean } = {}): Promise<PackageBuildResult> {
    // 1. Verify site ownership
    const site = await tenantRepository.getSite({ userId }, siteId);

    // 2. Authoritative Entitlement Check (FR-069, FR-082)
    if (!options.bypassEntitlements) {
      await entitlementService.assertCanExportSite(userId, siteId);
    }

    // 3. Load canonical site configuration
    const config = await tenantRepository.getDraftConfiguration({ userId }, siteId);

    // 4. Compile HTML routes & base styling
    const { files: htmlFiles, routes } = compileSiteHtml(config);

    // 5. Bundle and verify assets
    const { assetFiles, assetManifest } = bundleSiteAssets(config);

    // 6. Scan dependencies & generate manifest
    const { dependencyReport, manifest, manifestJsonContent, reportMarkdownContent } = scanExportDependencies(
      config,
      routes,
      assetManifest
    );

    // 7. Generate deployment configs for 5 static hosts
    const deploymentFiles = generateDeploymentConfigs(config, routes);

    // 8. Assemble full package file list
    const allFiles: ExportOutputFile[] = [
      ...htmlFiles,
      ...assetFiles,
      ...deploymentFiles,
      {
        path: "manifest.json",
        content: manifestJsonContent,
        contentType: "application/json",
      },
      {
        path: "dependencies.json",
        content: JSON.stringify(dependencyReport, null, 2),
        contentType: "application/json",
      },
      {
        path: "DEPENDENCY_REPORT.md",
        content: reportMarkdownContent,
        contentType: "text/markdown",
      },
    ];

    // 9. Run automated zero-secret scanner (TDD §21.5, §29.3)
    scanFilesForSecrets(allFiles);

    // 10. Build standard PKWARE ZIP archive
    const { buffer: zipBuffer, sha256, sizeBytes, fileCount } = buildZipArchive(allFiles);
    const exportId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    return {
      exportId,
      siteId,
      zipBuffer,
      sha256,
      sizeBytes,
      manifest,
      dependencyReport,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Initiates static export compilation, persists the ZIP artifact, and generates a signed download token.
   */
  async initiateExport(req: ExportRequestOptions): Promise<ExportInitiateResponse> {
    const buildResult = await this.compileSitePackage(req.userId, req.siteId);

    // Store in secure site directory
    const siteExportDir = path.join(this.exportsDir, req.siteId);
    if (!fs.existsSync(siteExportDir)) {
      fs.mkdirSync(siteExportDir, { recursive: true });
    }

    const artifactPath = path.join(siteExportDir, `${buildResult.exportId}.zip`);
    fs.writeFileSync(artifactPath, buildResult.zipBuffer);

    // Generate signed download token (15-min TTL)
    const token = generateDownloadToken({
      siteId: req.siteId,
      userId: req.userId,
      exportId: buildResult.exportId,
    });

    // Record audit event
    auditRepository.record({
      actorUserId: req.userId,
      action: "site.exported_static_package",
      targetType: "site",
      targetId: req.siteId,
      metadata: {
        exportId: buildResult.exportId,
        sha256: buildResult.sha256,
        sizeBytes: buildResult.sizeBytes,
      },
    });

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const downloadUrl = `/api/export/${req.siteId}/download?token=${token}`;

    return {
      success: true,
      exportId: buildResult.exportId,
      downloadUrl,
      expiresAt,
      sha256: buildResult.sha256,
      sizeBytes: buildResult.sizeBytes,
      fileCount: buildResult.manifest.routes.length,
      manifest: buildResult.manifest,
      dependencyReport: buildResult.dependencyReport,
    };
  }

  /**
   * Retrieves the raw ZIP file for a valid, unexpired download token.
   */
  async getExportArtifact(
    siteId: string,
    token: string
  ): Promise<{ zipBuffer: Buffer; exportId: string }> {
    const verified = verifyDownloadToken(token);
    if (!verified.valid || !verified.payload) {
      throw new Error(`Unauthorized export download: ${verified.reason || "Invalid token"}`);
    }

    if (verified.payload.siteId !== siteId) {
      throw new Error("Token mismatch: Token was not issued for this site");
    }

    const artifactPath = path.join(this.exportsDir, siteId, `${verified.payload.exportId}.zip`);
    if (!fs.existsSync(artifactPath)) {
      throw new Error("Export artifact expired or not found on server");
    }

    const zipBuffer = fs.readFileSync(artifactPath);
    return { zipBuffer, exportId: verified.payload.exportId };
  }
}

export const exportService = new ExportService();
