"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionComponentProps } from "@/registry/types";
import { useSectionAnimation } from "@/registry/motion/use-animation";

export interface ServiceCardItem {
  title: string;
  description: string;
  ctaLabel?: string;
  targetRoute?: string;
  badge?: string;
}

export interface ServicesCardGridContent {
  heading: string;
  intro?: string;
  items: ServiceCardItem[];
}

export function ServicesCardGridSection({
  instanceId,
  content,
  animationPreset = "stagger-cards",
}: SectionComponentProps<ServicesCardGridContent>) {
  const containerRef = useSectionAnimation(animationPreset);

  return (
    <section
      id={instanceId}
      ref={containerRef}
      className="py-16 md:py-24"
      style={{
        backgroundColor: "var(--theme-surface, #ffffff)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
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
            <p
              data-animate
              className="text-lg leading-relaxed"
              style={{
                fontFamily: "var(--theme-font-body, sans-serif)",
                color: "var(--theme-muted, #586766)",
              }}
            >
              {content.intro}
            </p>
          ) : null}
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {content.items?.map((item, idx) => (
            <div
              key={idx}
              data-animate
              className="group flex flex-col justify-between p-8 rounded-xl border transition-all duration-300 hover:shadow-lg"
              style={{
                backgroundColor: "var(--theme-bg, #faf8f3)",
                borderColor: "var(--theme-border, #e2ddd3)",
                borderRadius: "var(--theme-radius-card, 1rem)",
              }}
            >
              <div className="space-y-4">
                {item.badge ? (
                  <span
                    className="inline-block px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded"
                    style={{
                      backgroundColor: "var(--theme-surface, #ffffff)",
                      color: "var(--theme-accent, #d6a24a)",
                      borderWidth: "1px",
                      borderColor: "var(--theme-border, #e2ddd3)",
                    }}
                  >
                    {item.badge}
                  </span>
                ) : null}

                <h3
                  className="text-xl font-bold tracking-tight"
                  style={{
                    fontFamily: "var(--theme-font-display, serif)",
                    color: "var(--theme-text, #1d2a2a)",
                  }}
                >
                  {item.title}
                </h3>

                <p
                  className="text-sm leading-relaxed"
                  style={{
                    fontFamily: "var(--theme-font-body, sans-serif)",
                    color: "var(--theme-muted, #586766)",
                  }}
                >
                  {item.description}
                </p>
              </div>

              {item.targetRoute && item.ctaLabel ? (
                <div className="pt-6 mt-6 border-t" style={{ borderColor: "var(--theme-border, #e2ddd3)" }}>
                  <Link
                    href={item.targetRoute}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:opacity-80"
                    style={{ color: "var(--theme-primary, #174a50)" }}
                  >
                    <span>{item.ctaLabel}</span>
                    <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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
