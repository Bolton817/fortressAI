import { randomUUID } from "node:crypto";
import {
  BusinessBrief,
  BusinessBriefSchema,
  RawBriefInputSchema,
  BrandTone,
  ConversionGoal,
  OfferingItem,
  ProvenanceSource,
} from "@/core/schema/business-brief";
import { SchemaValidationError } from "@/core/errors";

/**
 * Fortress AI — Intake Brief Normaliser (TDD §11.1 Stage A, FR-015)
 * Sanitizes and converts raw intake input into a strongly typed,
 * provenance-tracked BusinessBrief fact ledger.
 */

function sanitizeString(val: string): string {
  // Strip control characters, script tags and obvious injection delimiters
  return val
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim();
}

function mapIndustryToTone(industry: string): BrandTone {
  const ind = industry.toLowerCase();
  if (ind.includes("safari") || ind.includes("tourism") || ind.includes("hotel") || ind.includes("travel")) {
    return "warm-editorial";
  }
  if (ind.includes("trade") || ind.includes("construction") || ind.includes("artisan") || ind.includes("craft")) {
    return "craft-artisan";
  }
  if (ind.includes("creative") || ind.includes("design") || ind.includes("marketing") || ind.includes("media")) {
    return "vibrant-energetic";
  }
  if (ind.includes("health") || ind.includes("wellness") || ind.includes("legal") || ind.includes("tech")) {
    return "minimal-refined";
  }
  return "modern-authoritative";
}

function mapConversionGoal(goal?: string): ConversionGoal {
  if (!goal) return "enquiry";
  const g = goal.toLowerCase();
  if (g.includes("quote")) return "quote";
  if (g.includes("call") || g.includes("phone") || g.includes("whatsapp")) return "call";
  if (g.includes("book") || g.includes("reserve")) return "booking";
  if (g.includes("portfolio") || g.includes("work")) return "portfolio";
  if (g.includes("visit") || g.includes("location")) return "visit";
  return "enquiry";
}

export function normalizeBusinessBrief(
  siteId: string,
  rawInput: unknown
): BusinessBrief {
  const parsedRaw = RawBriefInputSchema.safeParse(rawInput);
  if (!parsedRaw.success) {
    throw new SchemaValidationError(
      "Invalid raw business brief input",
      parsedRaw.error.flatten().fieldErrors
    );
  }

  const raw = parsedRaw.data;
  const provenanceMap: Record<string, ProvenanceSource> = {};

  const businessName = sanitizeString(raw.businessName);
  provenanceMap["businessName"] = "USER_PROVIDED";

  const industry = sanitizeString(raw.industry);
  provenanceMap["industry"] = "USER_PROVIDED";

  let summary = "";
  if (raw.summary?.trim()) {
    summary = sanitizeString(raw.summary);
    provenanceMap["summary"] = "USER_PROVIDED";
  } else if (raw.description?.trim()) {
    summary = sanitizeString(raw.description);
    provenanceMap["summary"] = "USER_PROVIDED";
  } else {
    summary = `${businessName} provides premium ${industry} services and solutions tailored to client needs.`;
    provenanceMap["summary"] = "INFERRED_DEFAULT";
  }

  // Location normalisation
  const city = raw.city ? sanitizeString(raw.city) : "Nairobi";
  const country = raw.country ? sanitizeString(raw.country) : "Kenya";
  provenanceMap["location.city"] = raw.city ? "USER_PROVIDED" : "INFERRED_DEFAULT";
  provenanceMap["location.country"] = raw.country ? "USER_PROVIDED" : "INFERRED_DEFAULT";

  const location = {
    city,
    region: "East Africa",
    country,
    address: raw.address ? sanitizeString(raw.address) : undefined,
    isPhysicalLocation: Boolean(raw.address?.trim()),
  };
  if (raw.address) provenanceMap["location.address"] = "USER_PROVIDED";

  // Offerings normalisation
  const offerings: OfferingItem[] = [];
  if (Array.isArray(raw.services) && raw.services.length > 0) {
    for (const s of raw.services) {
      if (typeof s === "string") {
        const cleanName = sanitizeString(s);
        if (cleanName.length > 0) {
          offerings.push({
            name: cleanName,
            summary: `Professional ${cleanName.toLowerCase()} delivering reliable outcomes.`,
          });
        }
      } else if (s && typeof s === "object" && s.name) {
        offerings.push({
          name: sanitizeString(s.name),
          summary: s.summary
            ? sanitizeString(s.summary)
            : `Comprehensive ${sanitizeString(s.name).toLowerCase()} customized for each client.`,
        });
      }
    }
  }

  if (offerings.length === 0) {
    offerings.push(
      {
        name: `${industry} Consultation`,
        summary: `Expert initial assessment and advisory for ${industry.toLowerCase()} requirements.`,
      },
      {
        name: `Bespoke Execution`,
        summary: `Tailored implementation and end-to-end delivery of high-quality solutions.`,
      }
    );
    provenanceMap["offerings"] = "INFERRED_DEFAULT";
  } else {
    provenanceMap["offerings"] = "USER_PROVIDED";
  }

  // Target audience
  let targetAudience = "";
  if (raw.targetAudience?.trim()) {
    targetAudience = sanitizeString(raw.targetAudience);
    provenanceMap["targetAudience"] = "USER_PROVIDED";
  } else {
    targetAudience = `Discerning clients, organizations and individuals seeking reliable ${industry.toLowerCase()} expertise.`;
    provenanceMap["targetAudience"] = "INFERRED_DEFAULT";
  }

  // Brand tone
  let brandTone: BrandTone = mapIndustryToTone(industry);
  if (raw.tone) {
    const toneSanitized = sanitizeString(raw.tone).toLowerCase();
    if (
      ["warm-editorial", "modern-authoritative", "vibrant-energetic", "craft-artisan", "minimal-refined"].includes(
        toneSanitized
      )
    ) {
      brandTone = toneSanitized as BrandTone;
      provenanceMap["brandTone"] = "USER_PROVIDED";
    } else {
      provenanceMap["brandTone"] = "INFERRED_DEFAULT";
    }
  } else {
    provenanceMap["brandTone"] = "INFERRED_DEFAULT";
  }

  // Contact
  const contact: any = {};
  if (raw.email?.trim()) {
    contact.email = sanitizeString(raw.email).toLowerCase();
    provenanceMap["contact.email"] = "USER_PROVIDED";
  }
  if (raw.phone?.trim()) {
    contact.phone = sanitizeString(raw.phone);
    provenanceMap["contact.phone"] = "USER_PROVIDED";
  }
  if (raw.whatsapp?.trim()) {
    contact.whatsapp = sanitizeString(raw.whatsapp);
    provenanceMap["contact.whatsapp"] = "USER_PROVIDED";
  }
  contact.hours = "Monday – Friday: 8:00 AM – 5:00 PM";
  provenanceMap["contact.hours"] = "INFERRED_DEFAULT";

  // Conversion goal
  const conversionGoal = mapConversionGoal(raw.conversionGoal);
  provenanceMap["conversionGoal"] = raw.conversionGoal ? "USER_PROVIDED" : "INFERRED_DEFAULT";

  // Supplied proof (Testimonials, Metrics)
  const suppliedProof: any = {
    testimonials: [],
    metrics: [],
    accreditations: [],
  };

  if (Array.isArray(raw.testimonials) && raw.testimonials.length > 0) {
    for (const t of raw.testimonials) {
      if (t.quote?.trim() && t.authorName?.trim()) {
        suppliedProof.testimonials.push({
          quote: sanitizeString(t.quote),
          authorName: sanitizeString(t.authorName),
          authorTitle: t.authorTitle ? sanitizeString(t.authorTitle) : undefined,
        });
      }
    }
    provenanceMap["suppliedProof.testimonials"] = "USER_PROVIDED";
  } else {
    provenanceMap["suppliedProof.testimonials"] = "UNVERIFIED_OMIT";
  }

  if (Array.isArray(raw.metrics) && raw.metrics.length > 0) {
    for (const m of raw.metrics) {
      if (m.value?.trim() && m.label?.trim()) {
        suppliedProof.metrics.push({
          value: sanitizeString(m.value),
          label: sanitizeString(m.label),
          context: m.context ? sanitizeString(m.context) : undefined,
        });
      }
    }
    provenanceMap["suppliedProof.metrics"] = "USER_PROVIDED";
  }

  const briefPayload: BusinessBrief = {
    briefId: randomUUID(),
    siteId,
    businessName,
    industry,
    summary,
    location,
    offerings,
    targetAudience,
    brandTone,
    preferredThemeId: raw.preferredThemeId,
    contact,
    conversionGoal,
    socialLinks: [],
    suppliedProof,
    locale: "en-KE",
    provenanceMap,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const validation = BusinessBriefSchema.safeParse(briefPayload);
  if (!validation.success) {
    throw new SchemaValidationError(
      "Failed to normalise business brief into valid schema",
      validation.error.flatten().fieldErrors
    );
  }

  return validation.data;
}
