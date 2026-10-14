"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionComponentProps } from "@/registry/types";
import { SectionManifest } from "@/core/schema/manifest";
import { useSectionAnimation } from "@/registry/motion/use-animation";

export const heroCenteredManifest: SectionManifest = {
  id: "hero.centered",
  version: "1.0.0",
  label: "Centered Impact Hero",
  description: "Bold centered headline and value proposition with dual CTA cluster, suited for digital products and consulting.",
  pageTypes: ["home"],
  industries: ["general", "consulting", "technology", "creative"],
  layoutType: "hero-centered",
  contentSchemaVersion: "hero.centered.v1",
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

export interface HeroCenteredContent {
  badge?: string;
  headline: string;
  subheadline: string;
  primaryCtaLabel: string;
  primaryCtaRoute: string;
  secondaryCtaLabel?: string;
  secondaryCtaRoute?: string;
}

export function HeroCenteredSection({
  instanceId,
  content,
  animationPreset = "fade-up",
}: SectionComponentProps<HeroCenteredContent>) {
  const containerRef = useSectionAnimation(animationPreset);

  return (
    <section
      id={instanceId}
      ref={containerRef}
      className="py-20 md:py-32 text-center relative overflow-hidden"
      style={{ backgroundColor: "var(--theme-bg, #faf8f3)" }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {content.badge ? (
          <div
            data-animate
            className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border"
            style={{
              backgroundColor: "var(--theme-surface, #ffffff)",
              color: "var(--theme-accent, #d6a24a)",
              borderColor: "var(--theme-border, #e2ddd3)",
            }}
          >
            {content.badge}
          </div>
        ) : null}

        <h1
          data-animate
          className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight"
          style={{
            fontFamily: "var(--theme-font-display, serif)",
            color: "var(--theme-text, #1d2a2a)",
          }}
        >
          {content.headline}
        </h1>

        <p
          data-animate
          className="text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto"
          style={{
            fontFamily: "var(--theme-font-body, sans-serif)",
            color: "var(--theme-muted, #586766)",
          }}
        >
          {content.subheadline}
        </p>

        <div data-animate className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href={content.primaryCtaRoute}
            className="inline-flex items-center justify-center gap-2 px-7 py-4 text-base font-medium shadow-md transition-all hover:opacity-95"
            style={{
              backgroundColor: "var(--theme-primary, #174a50)",
              color: "#ffffff",
              borderRadius: "var(--theme-radius-btn, 0.5rem)",
            }}
          >
            <span>{content.primaryCtaLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          {content.secondaryCtaLabel && content.secondaryCtaRoute ? (
            <Link
              href={content.secondaryCtaRoute}
              className="inline-flex items-center justify-center px-7 py-4 text-base font-medium border transition-colors hover:bg-black/5"
              style={{
                color: "var(--theme-text, #1d2a2a)",
                borderColor: "var(--theme-border, #e2ddd3)",
                borderRadius: "var(--theme-radius-btn, 0.5rem)",
                backgroundColor: "var(--theme-surface, #ffffff)",
              }}
            >
              {content.secondaryCtaLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
