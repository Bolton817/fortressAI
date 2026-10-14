"use client";

import React from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { SectionComponentProps } from "@/registry/types";
import { SectionManifest } from "@/core/schema/manifest";
import { useSectionAnimation } from "@/registry/motion/use-animation";

export const servicesAlternatingManifest: SectionManifest = {
  id: "services.alternating-rows",
  version: "1.0.0",
  label: "Alternating Feature Rows",
  description: "Detailed service presentations with alternating imagery and feature deliverables.",
  pageTypes: ["home", "services"],
  industries: ["general", "tourism", "consulting", "technology"],
  layoutType: "alternating-rows",
  contentSchemaVersion: "services.alternating.v1",
  mediaSlots: [
    {
      slotId: "service_row_image",
      required: false,
      aspectRatio: "16:9",
      acceptedSubjectTags: ["service", "feature", "action", "workspace"],
      description: "Visual for the primary featured service row.",
    },
  ],
  animationPresets: ["fade-up"],
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

export interface ServiceRow {
  badge?: string;
  title: string;
  description: string;
  deliverables?: string[];
  ctaLabel?: string;
  targetRoute?: string;
}

export interface ServicesAlternatingContent {
  sectionHeading: string;
  sectionIntro?: string;
  rows: ServiceRow[];
}

export function ServicesAlternatingSection({
  instanceId,
  content,
  assetBindings,
  animationPreset = "fade-up",
}: SectionComponentProps<ServicesAlternatingContent>) {
  const containerRef = useSectionAnimation(animationPreset);
  const media = assetBindings[0];

  return (
    <section
      id={instanceId}
      ref={containerRef}
      className="py-16 md:py-24"
      style={{ backgroundColor: "var(--theme-surface, #ffffff)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2
            data-animate
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{
              fontFamily: "var(--theme-font-display, serif)",
              color: "var(--theme-text, #1d2a2a)",
            }}
          >
            {content.sectionHeading}
          </h2>
          {content.sectionIntro ? (
            <p data-animate className="text-lg" style={{ color: "var(--theme-muted, #586766)" }}>
              {content.sectionIntro}
            </p>
          ) : null}
        </div>

        <div className="space-y-16">
          {content.rows?.map((row, idx) => {
            const isReverse = idx % 2 === 1;
            return (
              <div
                key={idx}
                data-animate
                className={`grid grid-cols-1 lg:grid-cols-12 gap-12 items-center ${
                  isReverse ? "lg:flex-row-reverse" : ""
                }`}
              >
                <div className={`space-y-6 ${media ? "lg:col-span-7" : "lg:col-span-10 lg:col-start-2"} ${isReverse ? "lg:order-2" : "lg:order-1"}`}>
                  {row.badge ? (
                    <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded border" style={{ color: "var(--theme-accent, #d6a24a)", borderColor: "var(--theme-border, #e2ddd3)" }}>
                      {row.badge}
                    </span>
                  ) : null}
                  <h3
                    className="text-2xl sm:text-3xl font-bold tracking-tight"
                    style={{
                      fontFamily: "var(--theme-font-display, serif)",
                      color: "var(--theme-text, #1d2a2a)",
                    }}
                  >
                    {row.title}
                  </h3>
                  <p className="text-base sm:text-lg leading-relaxed" style={{ color: "var(--theme-muted, #586766)" }}>
                    {row.description}
                  </p>

                  {row.deliverables?.length ? (
                    <ul className="space-y-2 pt-2">
                      {row.deliverables.map((item, dIdx) => (
                        <li key={dIdx} className="flex items-center gap-2.5 text-sm font-medium" style={{ color: "var(--theme-text, #1d2a2a)" }}>
                          <Check className="w-4 h-4 shrink-0" style={{ color: "var(--theme-accent, #d6a24a)" }} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {row.ctaLabel && row.targetRoute ? (
                    <div className="pt-2">
                      <Link
                        href={row.targetRoute}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-85"
                        style={{ color: "var(--theme-primary, #174a50)" }}
                      >
                        <span>{row.ctaLabel}</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  ) : null}
                </div>

                {media ? (
                  <div className={`lg:col-span-5 ${isReverse ? "lg:order-1" : "lg:order-2"}`}>
                    <div
                      className="aspect-video lg:aspect-4/3 rounded-xl overflow-hidden shadow-md border"
                      style={{
                        borderColor: "var(--theme-border, #e2ddd3)",
                        borderRadius: "var(--theme-radius-card, 1rem)",
                      }}
                    >
                      <img src={media.url} alt={media.altText || row.title} className="w-full h-full object-cover" />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
