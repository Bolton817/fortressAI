"use client";

import React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { SectionComponentProps } from "@/registry/types";
import { SectionManifest } from "@/core/schema/manifest";
import { useSectionAnimation } from "@/registry/motion/use-animation";

export const servicesPricingManifest: SectionManifest = {
  id: "services.pricing-table",
  version: "1.0.0",
  label: "Tiered Pricing Comparison",
  description: "Comparison table across verified service tiers. Rendered only when customer pricing data is confirmed.",
  pageTypes: ["services", "home"],
  industries: ["general", "technology", "consulting"],
  layoutType: "pricing-table",
  contentSchemaVersion: "services.pricing.v1",
  mediaSlots: [],
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

export interface PricingTier {
  name: string;
  priceFormatted: string;
  period?: string; // e.g. "/ month" or "fixed"
  description: string;
  isPopular?: boolean;
  features: string[];
  ctaLabel: string;
  ctaRoute: string;
}

export interface ServicesPricingContent {
  heading: string;
  intro?: string;
  tiers: PricingTier[];
}

export function ServicesPricingSection({
  instanceId,
  content,
  animationPreset = "stagger-cards",
}: SectionComponentProps<ServicesPricingContent>) {
  const containerRef = useSectionAnimation(animationPreset);

  return (
    <section
      id={instanceId}
      ref={containerRef}
      className="py-16 md:py-24"
      style={{ backgroundColor: "var(--theme-surface, #ffffff)" }}
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
          {content.intro ? (
            <p data-animate className="text-lg" style={{ color: "var(--theme-muted, #586766)" }}>
              {content.intro}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {content.tiers?.map((tier, idx) => (
            <div
              key={idx}
              data-animate
              className={`flex flex-col justify-between p-8 rounded-2xl border transition-all ${
                tier.isPopular ? "shadow-xl ring-2 scale-105 z-10" : "shadow-sm"
              }`}
              style={{
                backgroundColor: tier.isPopular ? "var(--theme-bg, #faf8f3)" : "var(--theme-surface, #ffffff)",
                borderColor: tier.isPopular ? "var(--theme-accent, #d6a24a)" : "var(--theme-border, #e2ddd3)",
              }}
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold" style={{ color: "var(--theme-text, #1d2a2a)" }}>
                    {tier.name}
                  </h3>
                  {tier.isPopular ? (
                    <span
                      className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full text-white"
                      style={{ backgroundColor: "var(--theme-accent, #d6a24a)" }}
                    >
                      Popular
                    </span>
                  ) : null}
                </div>

                <p className="text-sm" style={{ color: "var(--theme-muted, #586766)" }}>
                  {tier.description}
                </p>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold" style={{ color: "var(--theme-text, #1d2a2a)" }}>
                    {tier.priceFormatted}
                  </span>
                  {tier.period ? (
                    <span className="text-xs" style={{ color: "var(--theme-muted, #586766)" }}>
                      {tier.period}
                    </span>
                  ) : null}
                </div>

                <ul className="space-y-3 pt-4 border-t" style={{ borderColor: "var(--theme-border, #e2ddd3)" }}>
                  {tier.features?.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--theme-text, #1d2a2a)" }}>
                      <Check className="w-4 h-4 shrink-0" style={{ color: "var(--theme-primary, #174a50)" }} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8 mt-6">
                <Link
                  href={tier.ctaRoute}
                  className="w-full inline-flex items-center justify-center py-3 px-4 text-sm font-semibold transition-all shadow-sm"
                  style={{
                    backgroundColor: tier.isPopular ? "var(--theme-primary, #174a50)" : "var(--theme-surface, #ffffff)",
                    color: tier.isPopular ? "#ffffff" : "var(--theme-text, #1d2a2a)",
                    borderColor: "var(--theme-border, #e2ddd3)",
                    borderWidth: tier.isPopular ? 0 : 1,
                    borderRadius: "var(--theme-radius-btn, 0.5rem)",
                  }}
                >
                  {tier.ctaLabel}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
