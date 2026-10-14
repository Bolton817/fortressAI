"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionComponentProps } from "@/registry/types";
import { SectionManifest } from "@/core/schema/manifest";
import { useSectionAnimation } from "@/registry/motion/use-animation";

export const servicesListManifest: SectionManifest = {
  id: "services.list-detailed",
  version: "1.0.0",
  label: "Categorized Capability List",
  description: "Clean numbered capability list for advisory, legal, consulting, and corporate services.",
  pageTypes: ["services", "about", "home"],
  industries: ["consulting", "finance", "legal", "corporate", "general"],
  layoutType: "numbered-list",
  contentSchemaVersion: "services.list.v1",
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

export interface CapabilityItem {
  number: string; // e.g. "01"
  title: string;
  summary: string;
  tags?: string[];
  route?: string;
}

export interface ServicesListContent {
  headline: string;
  subhead?: string;
  items: CapabilityItem[];
}

export function ServicesListSection({
  instanceId,
  content,
  animationPreset = "fade-up",
}: SectionComponentProps<ServicesListContent>) {
  const containerRef = useSectionAnimation(animationPreset);

  return (
    <section
      id={instanceId}
      ref={containerRef}
      className="py-16 md:py-24"
      style={{ backgroundColor: "var(--theme-bg, #faf8f3)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="border-b pb-8" style={{ borderColor: "var(--theme-border, #e2ddd3)" }}>
          <h2
            data-animate
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{
              fontFamily: "var(--theme-font-display, serif)",
              color: "var(--theme-text, #1d2a2a)",
            }}
          >
            {content.headline}
          </h2>
          {content.subhead ? (
            <p data-animate className="text-lg mt-2" style={{ color: "var(--theme-muted, #586766)" }}>
              {content.subhead}
            </p>
          ) : null}
        </div>

        <div className="divide-y" style={{ borderColor: "var(--theme-border, #e2ddd3)" }}>
          {content.items?.map((item, idx) => (
            <div
              key={idx}
              data-animate
              className="py-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-start group transition-colors hover:bg-black/[0.02] px-4 rounded-lg"
            >
              <div className="md:col-span-2 text-2xl font-mono font-bold" style={{ color: "var(--theme-accent, #d6a24a)" }}>
                {item.number}
              </div>

              <div className="md:col-span-4">
                <h3
                  className="text-xl font-bold tracking-tight"
                  style={{
                    fontFamily: "var(--theme-font-display, serif)",
                    color: "var(--theme-text, #1d2a2a)",
                  }}
                >
                  {item.title}
                </h3>
                {item.tags?.length ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {item.tags.map((tag, tIdx) => (
                      <span key={tIdx} className="text-xs px-2 py-0.5 rounded bg-white/60 border text-slate-600" style={{ borderColor: "var(--theme-border, #e2ddd3)" }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="md:col-span-5 text-sm sm:text-base leading-relaxed" style={{ color: "var(--theme-muted, #586766)" }}>
                {item.summary}
              </div>

              {item.route ? (
                <div className="md:col-span-1 flex justify-end">
                  <Link href={item.route} className="p-2 rounded-full hover:bg-black/5" style={{ color: "var(--theme-primary, #174a50)" }}>
                    <ArrowUpRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
