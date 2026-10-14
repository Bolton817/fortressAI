"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionComponentProps } from "@/registry/types";
import { SectionManifest } from "@/core/schema/manifest";
import { useSectionAnimation } from "@/registry/motion/use-animation";

export const heroEditorialManifest: SectionManifest = {
  id: "hero.editorial",
  version: "1.0.0",
  label: "Asymmetric Editorial Hero",
  description: "Sophisticated editorial hero featuring high-impact typography, decorative quote/kicker, and framed media slot.",
  pageTypes: ["home", "about"],
  industries: ["tourism", "hospitality", "creative", "artisanal"],
  layoutType: "hero-editorial",
  contentSchemaVersion: "hero.editorial.v1",
  mediaSlots: [
    {
      slotId: "hero_editorial_image",
      required: true,
      aspectRatio: "4:3",
      acceptedSubjectTags: ["hero", "about", "feature", "landscape"],
      description: "Atmospheric portrait or landscape image representing brand aesthetic.",
    },
  ],
  animationPresets: ["fade-up", "image-reveal"],
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

export interface HeroEditorialContent {
  kicker: string;
  headline: string;
  subheadline: string;
  pullQuote?: string;
  ctaLabel: string;
  ctaRoute: string;
}

export function HeroEditorialSection({
  instanceId,
  content,
  assetBindings,
  animationPreset = "fade-up",
}: SectionComponentProps<HeroEditorialContent>) {
  const containerRef = useSectionAnimation(animationPreset);
  const media = assetBindings.find((b) => b.slotId === "hero_editorial_image") || assetBindings[0];

  return (
    <section
      id={instanceId}
      ref={containerRef}
      className="py-20 md:py-32 relative overflow-hidden"
      style={{ backgroundColor: "var(--theme-bg, #faf8f3)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-7 space-y-6">
            <span
              data-animate
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: "var(--theme-accent, #d6a24a)" }}
            >
              {content.kicker}
            </span>

            <h1
              data-animate
              className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight"
              style={{
                fontFamily: "var(--theme-font-display, serif)",
                color: "var(--theme-text, #1d2a2a)",
              }}
            >
              {content.headline}
            </h1>

            <p
              data-animate
              className="text-lg sm:text-xl leading-relaxed"
              style={{
                fontFamily: "var(--theme-font-body, sans-serif)",
                color: "var(--theme-muted, #586766)",
              }}
            >
              {content.subheadline}
            </p>

            {content.pullQuote ? (
              <p
                data-animate
                className="text-base italic border-l-2 pl-4 my-6"
                style={{
                  borderColor: "var(--theme-accent, #d6a24a)",
                  color: "var(--theme-primary, #174a50)",
                }}
              >
                &ldquo;{content.pullQuote}&rdquo;
              </p>
            ) : null}

            {content.ctaLabel ? (
              <div data-animate className="pt-4">
                <Link
                  href={content.ctaRoute || "#"}
                  className="inline-flex items-center gap-2 px-6 py-3.5 text-base font-medium shadow-md transition-all hover:opacity-95"
                  style={{
                    backgroundColor: "var(--theme-primary, #174a50)",
                    color: "#ffffff",
                    borderRadius: "var(--theme-radius-btn, 0.5rem)",
                  }}
                >
                  <span>{content.ctaLabel}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-5">
            <div
              data-animate
              className="relative aspect-4/3 rounded-2xl overflow-hidden shadow-2xl border p-2"
              style={{
                borderColor: "var(--theme-border, #e2ddd3)",
                backgroundColor: "var(--theme-surface, #ffffff)",
                borderRadius: "var(--theme-radius-card, 1rem)",
              }}
            >
              {media ? (
                <img
                  src={media.url}
                  alt={media.altText || content.headline}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
