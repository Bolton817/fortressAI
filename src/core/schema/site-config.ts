import { z } from "zod";
import { PageTypeSchema } from "./manifest";

/**
 * Fortress AI — Canonical Site Configuration Schema (TDD §8.1, §38)
 * The single source of truth for both hosted dynamic rendering and static export compilation.
 * Invariant: Hosted rendering and export must both be deterministic projections of this approved structure.
 */

export const AssetBindingSchema = z.object({
  slotId: z.string(),
  assetId: z.string(),
  url: z.string().url(),
  altText: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  aspectRatio: z.string().optional(),
  licenceType: z.string().optional(),
  exportPermitted: z.boolean().optional(),
});
export type AssetBinding = z.infer<typeof AssetBindingSchema>;

export const SectionInstanceSchema = z.object({
  instanceId: z.string().min(1),
  sectionId: z.string().min(1),
  sectionVersion: z.string().min(1),
  sortOrder: z.number().int().nonnegative().optional(),
  content: z.record(z.string(), z.any()),
  assetBindings: z.array(AssetBindingSchema).optional(),
  animationPresetOverride: z.string().optional(),
  settings: z.record(z.string(), z.any()).optional(),
});
export type SectionInstance = z.infer<typeof SectionInstanceSchema>;

export const PageRouteSchema = z.object({
  pageId: z.string().min(1),
  slug: z.string().regex(/^\/([a-z0-9\-_]*)$/, "Must be root '/' or lowercase slug path '/name'"),
  title: z.string().min(1),
  pageType: PageTypeSchema,
  seo: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    canonicalUrl: z.string().url().optional(),
    noIndex: z.boolean().optional(),
  }),
  sections: z.array(SectionInstanceSchema).min(1),
});
export type PageRoute = z.infer<typeof PageRouteSchema>;

export const BusinessProfileSummarySchema = z.object({
  name: z.string().min(1),
  industry: z.string().min(1),
  summary: z.string().min(1),
  location: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
});
export type BusinessProfileSummary = z.infer<typeof BusinessProfileSummarySchema>;

export const NavigationLinkSchema = z.object({
  label: z.string().min(1),
  targetRoute: z.string().min(1),
  isButton: z.boolean().optional(),
});
export type NavigationLink = z.infer<typeof NavigationLinkSchema>;

export const FooterColumnSchema = z.object({
  title: z.string().min(1),
  links: z.array(z.object({
    label: z.string().min(1),
    href: z.string().min(1),
  })),
});
export type FooterColumn = z.infer<typeof FooterColumnSchema>;

export const SiteConfigurationSchema = z.object({
  siteId: z.string().uuid(),
  platformSlug: z.string().min(3),
  version: z.number().int().positive(),
  businessProfile: BusinessProfileSummarySchema,
  theme: z.object({
    themeId: z.string().min(1),
    version: z.string().default("1.0.0"),
    tokenOverrides: z.record(z.string(), z.any()).optional(),
  }),
  navigation: z.object({
    brandName: z.string().min(1),
    logoAssetId: z.string().optional(),
    links: z.array(NavigationLinkSchema),
    sticky: z.boolean().optional(),
  }),
  footer: z.object({
    brandSummary: z.string(),
    columns: z.array(FooterColumnSchema),
    copyrightText: z.string(),
    showWhatsApp: z.boolean().optional(),
  }),
  pages: z.array(PageRouteSchema).min(1),
});

export type SiteConfiguration = z.infer<typeof SiteConfigurationSchema>;
