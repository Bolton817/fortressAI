import { z } from "zod";

/**
 * Fortress AI — Business Brief & Fact Ledger Schema (TDD §11.1 Stage A, §12.2, FR-015, FR-016)
 * Invariant: All factual data used in prompts and page composition must trace back
 * to a verified field in this brief. The AI pipeline is never permitted to invent
 * unsupplied facts (testimonials, prices, founding dates, credentials, or physical addresses).
 */

export const ProvenanceSourceSchema = z.enum([
  "USER_PROVIDED",
  "INFERRED_DEFAULT",
  "CONFIRMED_FOLLOWUP",
  "UNVERIFIED_OMIT",
]);
export type ProvenanceSource = z.infer<typeof ProvenanceSourceSchema>;

export const OfferingItemSchema = z.object({
  name: z.string().min(1).max(80),
  summary: z.string().min(1).max(250),
  details: z.array(z.string()).optional(),
  targetAudience: z.string().optional(),
});
export type OfferingItem = z.infer<typeof OfferingItemSchema>;

export const ContactInfoSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  hours: z.string().optional(),
});
export type ContactInfo = z.infer<typeof ContactInfoSchema>;

export const LocationInfoSchema = z.object({
  city: z.string().min(1),
  region: z.string().optional(),
  country: z.string().min(1),
  address: z.string().optional(),
  isPhysicalLocation: z.boolean().default(false),
});
export type LocationInfo = z.infer<typeof LocationInfoSchema>;

export const TestimonialEntrySchema = z.object({
  quote: z.string().min(5).max(300),
  authorName: z.string().min(1).max(80),
  authorTitle: z.string().max(80).optional(),
  company: z.string().max(80).optional(),
});
export type TestimonialEntry = z.infer<typeof TestimonialEntrySchema>;

export const MetricEntrySchema = z.object({
  value: z.string().min(1).max(20),
  label: z.string().min(1).max(60),
  context: z.string().max(120).optional(),
});
export type MetricEntry = z.infer<typeof MetricEntrySchema>;

export const SuppliedProofSchema = z.object({
  testimonials: z.array(TestimonialEntrySchema).default([]),
  metrics: z.array(MetricEntrySchema).default([]),
  accreditations: z.array(z.string()).default([]),
});
export type SuppliedProof = z.infer<typeof SuppliedProofSchema>;

export const ConversionGoalSchema = z.enum([
  "enquiry",
  "call",
  "quote",
  "booking",
  "portfolio",
  "visit",
]);
export type ConversionGoal = z.infer<typeof ConversionGoalSchema>;

export const BrandToneSchema = z.enum([
  "warm-editorial",
  "modern-authoritative",
  "vibrant-energetic",
  "craft-artisan",
  "minimal-refined",
]);
export type BrandTone = z.infer<typeof BrandToneSchema>;

export const SocialLinkSchema = z.object({
  platform: z.string().min(1),
  url: z.string().url(),
});
export type SocialLink = z.infer<typeof SocialLinkSchema>;

/**
 * Normalized Business Brief & Fact Ledger
 */
export const BusinessBriefSchema = z.object({
  briefId: z.string().min(1),
  siteId: z.string().min(1),
  businessName: z.string().min(1).max(100),
  industry: z.string().min(1).max(80),
  summary: z.string().min(10).max(1000),
  location: LocationInfoSchema,
  offerings: z.array(OfferingItemSchema).min(1).max(12),
  targetAudience: z.string().min(2).max(300),
  brandTone: BrandToneSchema.default("modern-authoritative"),
  preferredThemeId: z.string().optional(),
  contact: ContactInfoSchema,
  conversionGoal: ConversionGoalSchema.default("enquiry"),
  socialLinks: z.array(SocialLinkSchema).default([]),
  suppliedProof: SuppliedProofSchema.default({
    testimonials: [],
    metrics: [],
    accreditations: [],
  }),
  locale: z.string().default("en-KE"),
  provenanceMap: z.record(z.string(), ProvenanceSourceSchema).default({}),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().default(() => new Date().toISOString()),
});
export type BusinessBrief = z.infer<typeof BusinessBriefSchema>;

/**
 * Raw brief submission input before normalisation
 */
export const RawBriefInputSchema = z.object({
  businessName: z.string().min(1),
  industry: z.string().min(1),
  summary: z.string().optional(),
  description: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  address: z.string().optional(),
  services: z.array(z.union([z.string(), z.object({ name: z.string(), summary: z.string().optional() })])).optional(),
  targetAudience: z.string().optional(),
  tone: z.string().optional(),
  preferredThemeId: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  conversionGoal: z.string().optional(),
  testimonials: z.array(z.object({
    quote: z.string(),
    authorName: z.string(),
    authorTitle: z.string().optional(),
  })).optional(),
  metrics: z.array(z.object({
    value: z.string(),
    label: z.string(),
    context: z.string().optional(),
  })).optional(),
});
export type RawBriefInput = z.infer<typeof RawBriefInputSchema>;
