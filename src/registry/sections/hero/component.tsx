"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionComponentProps } from "@/registry/types";
import { useSectionAnimation } from "@/registry/motion/use-animation";

export interface HeroSplitContent {
  headline: string;
  subheadline: string;
  badge?: string;
  primaryCtaLabel?: string;
  primaryCtaRoute?: string;
  primaryCta?: { label?: string; targetRoute?: string };
  secondaryCtaLabel?: string;
  secondaryCtaRoute?: string;
  secondaryCta?: { label?: string; targetRoute?: string };
}

export function HeroSplitSection({
  instanceId,
  content,
  assetBindings,
  animationPreset = "fade-up",
}: SectionComponentProps<HeroSplitContent>) {
  const containerRef = useSectionAnimation(animationPreset);
  const heroImage = assetBindings.find((b) => b.slotId === "hero_image");

  return (
    <section
      id={instanceId}
      ref={containerRef}
      className="relative overflow-hidden py-16 md:py-24"
      style={{
        backgroundColor: "var(--theme-bg, #faf8f3)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Content Column */}
          <div className="lg:col-span-7 space-y-6">
            {content.badge ? (
              <div
                data-animate
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase"
                style={{
                  backgroundColor: "var(--theme-surface, #ffffff)",
                  color: "var(--theme-accent, #d6a24a)",
                  borderColor: "var(--theme-border, #e2ddd3)",
                  borderWidth: "1px",
                }}
              >
                {content.badge}
              </div>
            ) : null}

            <h1
              data-animate
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight"
              style={{
                fontFamily: "var(--theme-font-display, serif)",
                color: "var(--theme-text, #1d2a2a)",
              }}
            >
              {content.headline}
            </h1>

            <p
              data-animate
              className="text-lg sm:text-xl leading-relaxed max-w-2xl"
              style={{
                fontFamily: "var(--theme-font-body, sans-serif)",
                color: "var(--theme-muted, #586766)",
              }}
            >
              {content.subheadline}
            </p>

            {/* CTAs */}
            <div data-animate className="flex flex-wrap items-center gap-4 pt-4">
              <Link
                href={content.primaryCtaRoute || content.primaryCta?.targetRoute || "#"}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-medium shadow-md transition-all hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  backgroundColor: "var(--theme-primary, #174a50)",
                  color: "#ffffff",
                  borderRadius: "var(--theme-radius-btn, 0.5rem)",
                }}
              >
                <span>{content.primaryCtaLabel || content.primaryCta?.label || "Learn More"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              {(content.secondaryCtaLabel || content.secondaryCta?.label) &&
              (content.secondaryCtaRoute || content.secondaryCta?.targetRoute) ? (
                <Link
                  href={content.secondaryCtaRoute || content.secondaryCta?.targetRoute || "#"}
                  className="inline-flex items-center justify-center px-6 py-3.5 text-base font-medium transition-all hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2 border"
                  style={{
                    color: "var(--theme-text, #1d2a2a)",
                    borderColor: "var(--theme-border, #e2ddd3)",
                    borderRadius: "var(--theme-radius-btn, 0.5rem)",
                    backgroundColor: "var(--theme-surface, #ffffff)",
                  }}
                >
                  {content.secondaryCtaLabel || content.secondaryCta?.label}
                </Link>
              ) : null}
            </div>
          </div>

          {/* Media Column */}
          <div className="lg:col-span-5">
            <div
              data-animate
              className="relative w-full aspect-video sm:aspect-4/3 lg:aspect-16/10 rounded-2xl overflow-hidden shadow-xl border"
              style={{
                borderColor: "var(--theme-border, #e2ddd3)",
                borderRadius: "var(--theme-radius-card, 1rem)",
                backgroundColor: "var(--theme-surface, #ffffff)",
              }}
            >
              {heroImage ? (
                <img
                  src={heroImage.url}
                  alt={heroImage.altText || content.headline}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  loading="eager"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-medium opacity-50">
                  Featured Media Slot
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
