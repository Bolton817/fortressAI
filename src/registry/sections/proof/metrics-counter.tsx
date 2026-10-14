"use client";

import React from "react";
import { SectionComponentProps } from "@/registry/types";
import { SectionManifest } from "@/core/schema/manifest";
import { useSectionAnimation } from "@/registry/motion/use-animation";

export const proofMetricsManifest: SectionManifest = {
  id: "proof.metrics-counter",
  version: "1.0.0",
  label: "Quantitative Metrics & Proof Counters",
  description: "Displays confirmed quantitative facts and track record milestones.",
  pageTypes: ["home", "about", "services"],
  industries: ["general", "consulting", "tourism", "finance", "trades"],
  layoutType: "metrics-bar",
  contentSchemaVersion: "proof.metrics.v1",
  mediaSlots: [],
  animationPresets: ["count-up", "fade-up"],
  accessibility: {
    semanticHeadingLevel: false,
    focusVisible: true,
    reducedMotionFallback: true,
  },
  export: {
    staticSafe: true,
    dependencies: [],
  },
  status: "released",
};

export interface MetricItem {
  value: string; // e.g. "15+", "450", "99%"
  label: string;
  context?: string;
}

export interface ProofMetricsContent {
  sectionTitle?: string;
  metrics: MetricItem[];
}

export function ProofMetricsSection({
  instanceId,
  content,
  animationPreset = "fade-up",
}: SectionComponentProps<ProofMetricsContent>) {
  const containerRef = useSectionAnimation(animationPreset);

  return (
    <section
      id={instanceId}
      ref={containerRef}
      className="py-16 border-y"
      style={{
        backgroundColor: "var(--theme-surface, #ffffff)",
        borderColor: "var(--theme-border, #e2ddd3)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {content.sectionTitle ? (
          <p
            data-animate
            className="text-center text-xs font-semibold uppercase tracking-widest mb-10"
            style={{ color: "var(--theme-muted, #586766)" }}
          >
            {content.sectionTitle}
          </p>
        ) : null}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x-0 md:divide-x divide-slate-200">
          {content.metrics?.map((metric, idx) => (
            <div key={idx} data-animate className="space-y-2 px-4">
              <div
                className="text-4xl sm:text-5xl font-extrabold tracking-tight"
                style={{
                  fontFamily: "var(--theme-font-display, serif)",
                  color: "var(--theme-primary, #174a50)",
                }}
              >
                {metric.value}
              </div>
              <div className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--theme-text, #1d2a2a)" }}>
                {metric.label}
              </div>
              {metric.context ? (
                <div className="text-xs" style={{ color: "var(--theme-muted, #586766)" }}>
                  {metric.context}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
