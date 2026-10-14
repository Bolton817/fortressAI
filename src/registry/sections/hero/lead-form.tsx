"use client";

import React from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { SectionComponentProps } from "@/registry/types";
import { SectionManifest } from "@/core/schema/manifest";
import { useSectionAnimation } from "@/registry/motion/use-animation";

export const heroLeadFormManifest: SectionManifest = {
  id: "hero.lead-form",
  version: "1.0.0",
  label: "Lead Capture Split Hero",
  description: "High-conversion hero with value propositions on left and an inquiry/booking capture card on right.",
  pageTypes: ["home"],
  industries: ["consulting", "trades", "finance", "healthcare", "general"],
  layoutType: "hero-lead-form",
  contentSchemaVersion: "hero.lead-form.v1",
  mediaSlots: [],
  animationPresets: ["fade-up"],
  accessibility: {
    semanticHeadingLevel: true,
    focusVisible: true,
    reducedMotionFallback: true,
  },
  export: {
    staticSafe: true,
    dependencies: ["contact-form"],
  },
  status: "released",
};

export interface HeroLeadFormContent {
  headline: string;
  subheadline: string;
  perks: string[];
  formTitle: string;
  formSubtitle?: string;
  ctaButtonText: string;
  privacyNotice?: string;
}

export function HeroLeadFormSection({
  instanceId,
  content,
  animationPreset = "fade-up",
}: SectionComponentProps<HeroLeadFormContent>) {
  const containerRef = useSectionAnimation(animationPreset);

  return (
    <section
      id={instanceId}
      ref={containerRef}
      className="py-16 md:py-24"
      style={{ backgroundColor: "var(--theme-bg, #faf8f3)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left: Value Propositions */}
          <div className="lg:col-span-7 space-y-6">
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
              className="text-lg sm:text-xl leading-relaxed"
              style={{
                fontFamily: "var(--theme-font-body, sans-serif)",
                color: "var(--theme-muted, #586766)",
              }}
            >
              {content.subheadline}
            </p>

            {content.perks?.length ? (
              <ul data-animate className="space-y-3 pt-2">
                {content.perks.map((perk, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-base font-medium" style={{ color: "var(--theme-text, #1d2a2a)" }}>
                    <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "var(--theme-accent, #d6a24a)" }} />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* Right: Lead Capture Form Card */}
          <div className="lg:col-span-5">
            <div
              data-animate
              className="p-8 rounded-2xl shadow-xl border"
              style={{
                backgroundColor: "var(--theme-surface, #ffffff)",
                borderColor: "var(--theme-border, #e2ddd3)",
                borderRadius: "var(--theme-radius-card, 1rem)",
              }}
            >
              <h2
                className="text-2xl font-bold tracking-tight mb-2"
                style={{
                  fontFamily: "var(--theme-font-display, serif)",
                  color: "var(--theme-text, #1d2a2a)",
                }}
              >
                {content.formTitle}
              </h2>
              {content.formSubtitle ? (
                <p className="text-sm mb-6" style={{ color: "var(--theme-muted, #586766)" }}>
                  {content.formSubtitle}
                </p>
              ) : null}

              <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                <div>
                  <label htmlFor="lead-name" className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--theme-muted, #586766)" }}>
                    Full Name
                  </label>
                  <input
                    id="lead-name"
                    type="text"
                    required
                    placeholder="Your name"
                    className="w-full px-4 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2"
                    style={{
                      borderColor: "var(--theme-border, #e2ddd3)",
                      backgroundColor: "var(--theme-bg, #faf8f3)",
                      color: "var(--theme-text, #1d2a2a)",
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="lead-contact" className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--theme-muted, #586766)" }}>
                    Email or Phone
                  </label>
                  <input
                    id="lead-contact"
                    type="text"
                    required
                    placeholder="you@company.com or +254..."
                    className="w-full px-4 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2"
                    style={{
                      borderColor: "var(--theme-border, #e2ddd3)",
                      backgroundColor: "var(--theme-bg, #faf8f3)",
                      color: "var(--theme-text, #1d2a2a)",
                    }}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-4 text-sm font-semibold shadow-md transition-all hover:opacity-95 flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: "var(--theme-primary, #174a50)",
                    color: "#ffffff",
                    borderRadius: "var(--theme-radius-btn, 0.5rem)",
                  }}
                >
                  <span>{content.ctaButtonText}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {content.privacyNotice ? (
                  <p className="text-xs text-center pt-2" style={{ color: "var(--theme-muted, #586766)" }}>
                    {content.privacyNotice}
                  </p>
                ) : null}
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
