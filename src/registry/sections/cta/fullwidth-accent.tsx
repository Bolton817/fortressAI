"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionComponentProps } from "@/registry/types";
import { SectionManifest } from "@/core/schema/manifest";
import { useSectionAnimation } from "@/registry/motion/use-animation";

export const ctaFullwidthManifest: SectionManifest = {
  id: "cta.fullwidth-accent",
  version: "1.0.0",
  label: "Full-Width Accent Conversion Banner",
  description: "Prominent conversion banner with high-contrast background and direct CTA.",
  pageTypes: ["home", "services", "about"],
  industries: ["general", "tourism", "consulting", "trades"],
  layoutType: "banner",
  contentSchemaVersion: "cta.fullwidth.v1",
  mediaSlots: [],
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

export interface CtaFullwidthContent {
  headline: string;
  subhead?: string;
  ctaLabel: string;
  ctaRoute: string;
}

export function CtaFullwidthSection({
  instanceId,
  content,
  animationPreset = "fade-up",
}: SectionComponentProps<CtaFullwidthContent>) {
  const containerRef = useSectionAnimation(animationPreset);

  return (
    <section
      id={instanceId}
      ref={containerRef}
      className="py-20 text-center relative overflow-hidden"
      style={{
        backgroundColor: "var(--theme-primary, #174a50)",
        color: "#ffffff",
      }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <h2
          data-animate
          className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight"
          style={{ fontFamily: "var(--theme-font-display, serif)" }}
        >
          {content.headline}
        </h2>

        {content.subhead ? (
          <p data-animate className="text-lg sm:text-xl opacity-90 max-w-2xl mx-auto">
            {content.subhead}
          </p>
        ) : null}

        <div data-animate className="pt-2">
          <Link
            href={content.ctaRoute}
            className="inline-flex items-center gap-2 px-8 py-4 text-base font-bold shadow-lg transition-transform hover:scale-105"
            style={{
              backgroundColor: "var(--theme-accent, #d6a24a)",
              color: "#ffffff",
              borderRadius: "var(--theme-radius-btn, 0.5rem)",
            }}
          >
            <span>{content.ctaLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
