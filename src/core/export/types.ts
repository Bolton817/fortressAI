import { z } from "zod";

/**
 * Fortress AI — Static Export & Data Portability Types (TDD §21, §29, §40.6, FR-080, FR-081, FR-082, FR-084)
 */

export interface ExportOutputFile {
  path: string;
  content: string | Buffer;
  contentType?: string;
}

export type DependencyStatus = "supported" | "external-required" | "not-included" | "unsupported" | "replaced";

export const DependencyItemSchema = z.object({
  feature: z.string().min(1),
  status: z.enum(["supported", "external-required", "not-included", "unsupported", "replaced"]),
  action: z.string().min(1),
  category: z.string().optional(),
});
export type DependencyItem = z.infer<typeof DependencyItemSchema>;

export const ExportManifestSchema = z.object({
  siteId: z.string().min(1),
  sourceRevision: z.string().min(1),
  exportCompilerVersion: z.string().min(1),
  generatedAt: z.string().datetime(),
  routes: z.array(z.string()),
  assets: z.array(
    z.object({
      assetId: z.string(),
      mode: z.enum(["local-copy", "remote-cdn", "placeholder"]),
      licenceValidated: z.boolean(),
    })
  ),
  dependencies: z.array(DependencyItemSchema),
  checks: z.object({
    routes: z.string(),
    links: z.string(),
    assets: z.string(),
    secretScan: z.string(),
  }),
});
export type ExportManifest = z.infer<typeof ExportManifestSchema>;

export interface DependencyReport {
  siteId: string;
  platformSlug: string;
  generatedAt: string;
  features: DependencyItem[];
  checks: {
    routes: string;
    links: string;
    assets: string;
    secretScan: string;
  };
  summary: {
    totalFeatures: number;
    supportedCount: number;
    externalRequiredCount: number;
    unsupportedCount: number;
  };
}

export interface ExportCompilationResult {
  siteId: string;
  files: ExportOutputFile[];
  manifest: ExportManifest;
  dependencyReport: DependencyReport;
  routes: string[];
  assetsCount: number;
}

export interface DownloadTokenPayload {
  siteId: string;
  userId: string;
  exportId: string;
  exp: number; // Unix epoch ms
}

export interface PackageBuildResult {
  exportId: string;
  siteId: string;
  zipBuffer: Buffer;
  sha256: string;
  sizeBytes: number;
  manifest: ExportManifest;
  dependencyReport: DependencyReport;
  createdAt: string;
}

export interface AccountExportBundle {
  exportVersion: string;
  exportedAt: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    phoneOptional?: string | null;
    timezone?: string | null;
    status: string;
    emailVerifiedAt?: string | null;
    termsAcceptedAt?: string | null;
    policyVersion?: string | null;
    createdAt: string;
  };
  sites: Array<{
    site: any;
    draftConfiguration?: any;
    publishedRevisions?: any[];
  }>;
  billing: {
    subscription?: any;
    invoices: any[];
    usageHistory: any[];
  };
  privacyAndConsent: {
    newsletterConsent?: any;
    auditLogs: any[];
    notifications: any[];
  };
}
