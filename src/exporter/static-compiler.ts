import { SiteConfiguration, SiteConfigurationSchema } from "@/core/schema/site-config";
import { compileSiteHtml } from "@/core/export/export-compiler";
import { bundleSiteAssets } from "@/core/export/asset-bundler";
import { scanExportDependencies } from "@/core/export/dependency-scanner";
import { generateDeploymentConfigs } from "@/core/export/deployment-guides";
import { ExportOutputFile as CoreExportOutputFile } from "@/core/export/types";

/**
 * Fortress AI — Static Export Compiler Facade (TDD §21, §40.6, FR-080, FR-081)
 * Provides backward-compatible entry point delegating to modular core/export services.
 */

export interface ExportOutputFile {
  path: string;
  content: string;
}

export interface ExportResult {
  siteId: string;
  files: ExportOutputFile[];
  dependencyReport: {
    features: Array<{ feature: string; status: string; action: string }>;
    checks: Record<string, string>;
  };
  manifest: {
    siteId: string;
    exportCompilerVersion: string;
    generatedAt: string;
    routes: string[];
    assetsCount: number;
  };
}

export function compileSiteToStatic(rawConfig: SiteConfiguration): ExportResult {
  const config = SiteConfigurationSchema.parse(rawConfig);

  const { files: htmlFiles, routes } = compileSiteHtml(config);
  const { assetFiles, assetManifest, assetsCount } = bundleSiteAssets(config);
  const { dependencyReport, manifest, manifestJsonContent, reportMarkdownContent } = scanExportDependencies(
    config,
    routes,
    assetManifest
  );
  const deploymentFiles = generateDeploymentConfigs(config, routes);

  const allFiles: CoreExportOutputFile[] = [
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

  const stringFiles: ExportOutputFile[] = allFiles.map((f) => ({
    path: f.path,
    content: typeof f.content === "string" ? f.content : f.content.toString("utf-8"),
  }));

  return {
    siteId: config.siteId,
    files: stringFiles,
    dependencyReport: {
      features: dependencyReport.features,
      checks: dependencyReport.checks,
    },
    manifest: {
      siteId: config.siteId,
      exportCompilerVersion: manifest.exportCompilerVersion,
      generatedAt: manifest.generatedAt,
      routes: manifest.routes,
      assetsCount,
    },
  };
}
