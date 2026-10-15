import { BusinessBrief } from "@/core/schema/business-brief";
import { SiteConfiguration, SectionInstance } from "@/core/schema/site-config";

/**
 * Fortress AI — Factuality & Testimonial Guardrail Assertion Engine (TDD §12.2, §16.5, FR-028, FR-043)
 * Invariant: Never invent customer reviews, quotes, ratings, awards, prices, or credentials.
 * If no verified proof is supplied, proof.testimonials-slider is omitted or replaced with
 * verified metrics or values.
 */

export interface FactualityViolation {
  field: string;
  rule: string;
  severity: "CRITICAL_OMIT" | "WARNING_FLAG";
  message: string;
}

export function enforceFactualityPolicy(
  brief: BusinessBrief,
  config: SiteConfiguration
): {
  compliantConfig: SiteConfiguration;
  violations: FactualityViolation[];
  remediationApplied: boolean;
} {
  const violations: FactualityViolation[] = [];
  let remediationApplied = false;

  const hasTestimonials =
    Array.isArray(brief.suppliedProof?.testimonials) &&
    brief.suppliedProof.testimonials.length > 0;

  const hasMetrics =
    Array.isArray(brief.suppliedProof?.metrics) &&
    brief.suppliedProof.metrics.length > 0;

  // Clone configuration to produce a compliant version
  const sanitizedPages = config.pages.map((page) => {
    const updatedSections: SectionInstance[] = [];

    for (const section of page.sections) {
      // Rule 1: Testimonials Slider Invariant (FR-028, FR-043, TDD §16.5)
      if (section.sectionId === "proof.testimonials-slider") {
        if (!hasTestimonials) {
          violations.push({
            field: `${page.slug} -> ${section.instanceId}`,
            rule: "NO_SYNTHETIC_TESTIMONIALS",
            severity: "CRITICAL_OMIT",
            message:
              "Brief contains no verified testimonials. Prohibiting proof.testimonials-slider to prevent hallucinated quotes.",
          });
          remediationApplied = true;

          // Replace with proof.metrics-counter if verified metrics exist, else replace with values-grid
          if (hasMetrics) {
            updatedSections.push({
              instanceId: `${section.instanceId}_metrics_substitute`,
              sectionId: "proof.metrics-counter",
              sectionVersion: "1.0.0",
              sortOrder: section.sortOrder,
              content: {
                heading: "Our Track Record & Standards",
                intro: `Measurable commitments and verified standards delivered across ${brief.location.city}.`,
                metrics: brief.suppliedProof.metrics.map((m) => ({
                  value: m.value,
                  label: m.label,
                  context: m.context || "Verified operational benchmark",
                })),
              },
            });
          } else {
            // Replace with values grid
            updatedSections.push({
              instanceId: `${section.instanceId}_values_substitute`,
              sectionId: "about.values-grid",
              sectionVersion: "1.0.0",
              sortOrder: section.sortOrder,
              content: {
                heading: "Core Principles & Standards",
                intro: `The foundational commitments that guide every project and client relationship at ${brief.businessName}.`,
                values: [
                  {
                    title: "Rigorous Integrity",
                    description: "Complete transparency and professional execution on every engagement.",
                  },
                  {
                    title: "Quality Excellence",
                    description: `Adhering to high standards in every ${brief.industry.toLowerCase()} service delivered.`,
                  },
                  {
                    title: "Client Partnership",
                    description: "Long-term relationships built on reliability, consistency, and clear outcomes.",
                  },
                ],
              },
            });
          }
          continue; // Done replacing
        }
      }

      // Rule 2: Ensure Contact sections never fabricate physical address if unverified
      if (section.sectionId === "contact.split-details") {
        const content = { ...section.content };
        if (!brief.location.address && content.address && content.address !== `${brief.location.city}, ${brief.location.country}`) {
          violations.push({
            field: `${page.slug} -> contact.address`,
            rule: "NO_FABRICATED_ADDRESS",
            severity: "CRITICAL_OMIT",
            message: "Overwriting unsupplied street address with safe city/country location.",
          });
          content.address = `${brief.location.city}, ${brief.location.country}`;
          remediationApplied = true;
        }
        updatedSections.push({ ...section, content });
        continue;
      }

      // Default: retain compliant section
      updatedSections.push(section);
    }

    return {
      ...page,
      sections: updatedSections,
    };
  });

  // Rule 3: Enforce Footer contact truth
  const sanitizedFooter = { ...config.footer };
  if (!brief.contact.whatsapp) {
    sanitizedFooter.showWhatsApp = false;
  }

  const compliantConfig: SiteConfiguration = {
    ...config,
    footer: sanitizedFooter,
    pages: sanitizedPages,
  };

  return {
    compliantConfig,
    violations,
    remediationApplied,
  };
}
