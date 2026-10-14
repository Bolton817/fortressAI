"use client";

import React from "react";
import { Quote } from "lucide-react";
import { SectionComponentProps } from "@/registry/types";
import { SectionManifest } from "@/core/schema/manifest";
import { useSectionAnimation } from "@/registry/motion/use-animation";

export const proofTestimonialsManifest: SectionManifest = {
  id: "proof.testimonials-slider",
  version: "1.0.0",
  label: "Authentic Client Endorsement Cards",
  description: "Displays real customer feedback with verified name and attribution. Invariant: Only rendered when authentic quotes are supplied.",
  pageTypes: ["home", "about"],
  industries: ["general", "tourism", "consulting", "trades", "hospitality"],
  layoutType: "testimonials-grid",
  contentSchemaVersion: "proof.testimonials.v1",
  mediaSlots: [
    {
      slotId: "client_avatar",
      required: false,
      aspectRatio: "1:1",
      acceptedSubjectTags: ["avatar", "client"],
      description: "Photo of quote author where permitted.",
    },
  ],
  animationPresets: ["fade-up", "stagger-cards"],
  accessibility: {
    semanticHeadingLevel: true,
    focusVisible: true,
    reducedMotionFallback: true,
  },
  export: {
    staticSafe: true,
    dependencies: [],
  },
  status: "released",
};

export interface TestimonialItem {
  quote: string;
  authorName: string;
  authorTitle?: string;
  companyName?: string;
}

export interface ProofTestimonialsContent {
  heading: string;
  subhead?: string;
  testimonials: TestimonialItem[];
}

export function ProofTestimonialsSection({
  instanceId,
  content,
  animationPreset = "stagger-cards",
}: SectionComponentProps<ProofTestimonialsContent>) {
  const containerRef = useSectionAnimation(animationPreset);

  return (
    <section
      id={instanceId}
      ref={containerRef}
      className="py-16 md:py-24"
      style={{ backgroundColor: "var(--theme-bg, #faf8f3)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2
            data-animate
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{
              fontFamily: "var(--theme-font-display, serif)",
              color: "var(--theme-text, #1d2a2a)",
            }}
          >
            {content.heading}
          </h2>
          {content.subhead ? (
            <p data-animate className="text-lg" style={{ color: "var(--theme-muted, #586766)" }}>
              {content.subhead}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {content.testimonials?.map((t, idx) => (
            <div
              key={idx}
              data-animate
              className="p-8 rounded-2xl border flex flex-col justify-between shadow-sm relative"
              style={{
                backgroundColor: "var(--theme-surface, #ffffff)",
                borderColor: "var(--theme-border, #e2ddd3)",
                borderRadius: "var(--theme-radius-card, 1rem)",
              }}
            >
              <Quote className="w-8 h-8 opacity-20 mb-4" style={{ color: "var(--theme-primary, #174a50)" }} />

              <blockquote className="text-base sm:text-lg leading-relaxed italic mb-6" style={{ color: "var(--theme-text, #1d2a2a)" }}>
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              <div className="pt-4 border-t flex items-center gap-3" style={{ borderColor: "var(--theme-border, #e2ddd3)" }}>
                <div>
                  <div className="font-bold text-sm" style={{ color: "var(--theme-text, #1d2a2a)" }}>
                    {t.authorName}
                  </div>
                  {t.authorTitle || t.companyName ? (
                    <div className="text-xs" style={{ color: "var(--theme-muted, #586766)" }}>
                      {[t.authorTitle, t.companyName].filter(Boolean).join(" • ")}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
