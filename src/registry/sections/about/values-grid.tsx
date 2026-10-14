"use client";

import React from "react";
import { Shield, Sparkles, Heart, Target } from "lucide-react";
import { SectionComponentProps } from "@/registry/types";
import { SectionManifest } from "@/core/schema/manifest";
import { useSectionAnimation } from "@/registry/motion/use-animation";

export const aboutValuesManifest: SectionManifest = {
  id: "about.values-grid",
  version: "1.0.0",
  label: "Core Values & Principles Grid",
  description: "Showcases 3 to 4 defining company values or operational pillars.",
  pageTypes: ["about", "home"],
  industries: ["general", "consulting", "tourism", "healthcare"],
  layoutType: "values-grid",
  contentSchemaVersion: "about.values.v1",
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

export interface ValuePillar {
  title: string;
  description: string;
  icon?: "shield" | "sparkles" | "heart" | "target";
}

export interface AboutValuesContent {
  heading: string;
  subhead?: string;
  pillars: ValuePillar[];
}

export function AboutValuesSection({
  instanceId,
  content,
  animationPreset = "stagger-cards",
}: SectionComponentProps<AboutValuesContent>) {
  const containerRef = useSectionAnimation(animationPreset);

  const renderIcon = (icon?: string) => {
    switch (icon) {
      case "shield":
        return <Shield className="w-6 h-6" style={{ color: "var(--theme-accent, #d6a24a)" }} />;
      case "sparkles":
        return <Sparkles className="w-6 h-6" style={{ color: "var(--theme-accent, #d6a24a)" }} />;
      case "heart":
        return <Heart className="w-6 h-6" style={{ color: "var(--theme-accent, #d6a24a)" }} />;
      default:
        return <Target className="w-6 h-6" style={{ color: "var(--theme-accent, #d6a24a)" }} />;
    }
  };

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {content.pillars?.map((pillar, idx) => (
            <div
              key={idx}
              data-animate
              className="p-8 rounded-xl border space-y-4 shadow-sm"
              style={{
                backgroundColor: "var(--theme-surface, #ffffff)",
                borderColor: "var(--theme-border, #e2ddd3)",
                borderRadius: "var(--theme-radius-card, 1rem)",
              }}
            >
              <div className="p-3 inline-block rounded-lg bg-black/[0.03]">
                {renderIcon(pillar.icon)}
              </div>
              <h3
                className="text-lg font-bold"
                style={{
                  fontFamily: "var(--theme-font-display, serif)",
                  color: "var(--theme-text, #1d2a2a)",
                }}
              >
                {pillar.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--theme-muted, #586766)" }}>
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
