"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import { SectionComponentProps } from "@/registry/types";
import { SectionManifest } from "@/core/schema/manifest";
import { useSectionAnimation } from "@/registry/motion/use-animation";

export const faqAccordionManifest: SectionManifest = {
  id: "faq.accordion",
  version: "1.0.0",
  label: "Collapsible FAQ Accordion",
  description: "Accessible, keyboard-operable FAQ accordion answering common customer inquiries.",
  pageTypes: ["home", "services", "about", "contact"],
  industries: ["general", "tourism", "consulting", "trades", "technology"],
  layoutType: "accordion",
  contentSchemaVersion: "faq.accordion.v1",
  mediaSlots: [],
  animationPresets: ["fade-up"],
  accessibility: {
    semanticHeadingLevel: true,
    focusVisible: true,
    reducedMotionFallback: true,
    notes: "Uses native semantic <details> and <summary> elements.",
  },
  export: {
    staticSafe: true,
    dependencies: [],
  },
  status: "released",
};

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqAccordionContent {
  heading: string;
  subhead?: string;
  items: FaqItem[];
}

export function FaqAccordionSection({
  instanceId,
  content,
  animationPreset = "fade-up",
}: SectionComponentProps<FaqAccordionContent>) {
  const containerRef = useSectionAnimation(animationPreset);

  return (
    <section
      id={instanceId}
      ref={containerRef}
      className="py-16 md:py-24"
      style={{ backgroundColor: "var(--theme-surface, #ffffff)" }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-4">
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

        <div className="space-y-4">
          {content.items?.map((item, idx) => (
            <details
              key={idx}
              data-animate
              className="group border rounded-xl p-6 transition-colors open:bg-black/[0.02]"
              style={{
                borderColor: "var(--theme-border, #e2ddd3)",
                backgroundColor: "var(--theme-bg, #faf8f3)",
                borderRadius: "var(--theme-radius-card, 1rem)",
              }}
            >
              <summary className="flex items-center justify-between cursor-pointer font-bold text-lg list-none focus:outline-none focus:ring-2 focus:ring-offset-2 rounded" style={{ color: "var(--theme-text, #1d2a2a)" }}>
                <span>{item.question}</span>
                <ChevronDown className="w-5 h-5 shrink-0 transition-transform group-open:rotate-180" style={{ color: "var(--theme-primary, #174a50)" }} />
              </summary>
              <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--theme-muted, #586766)" }}>
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
