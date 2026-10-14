"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionComponentProps } from "@/registry/types";
import { useSectionAnimation } from "@/registry/motion/use-animation";

export interface AboutStoryContent {
  title: string;
  storyParagraphs: string[];
  missionStatement?: string;
  ctaLabel?: string;
  ctaRoute?: string;
}

export function AboutStorySection({
  instanceId,
  content,
  assetBindings,
  animationPreset = "fade-up",
}: SectionComponentProps<AboutStoryContent>) {
  const containerRef = useSectionAnimation(animationPreset);
  const storyImage = assetBindings.find((b) => b.slotId === "story_image");

  return (
    <section
      id={instanceId}
      ref={containerRef}
      className="py-16 md:py-24 border-t"
      style={{
        backgroundColor: "var(--theme-bg, #faf8f3)",
        borderColor: "var(--theme-border, #e2ddd3)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Optional Story Image */}
          {storyImage ? (
            <div className="lg:col-span-5 order-2 lg:order-1">
              <div
                data-animate
                className="relative aspect-4/3 rounded-2xl overflow-hidden shadow-lg border"
                style={{
                  borderColor: "var(--theme-border, #e2ddd3)",
                  borderRadius: "var(--theme-radius-card, 1rem)",
                }}
              >
                <img
                  src={storyImage.url}
                  alt={storyImage.altText || content.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ) : null}

          {/* Text Content */}
          <div
            className={`space-y-6 ${storyImage ? "lg:col-span-7 order-1 lg:order-2" : "lg:col-span-10 lg:col-start-2"}`}
          >
            <h2
              data-animate
              className="text-3xl sm:text-4xl font-bold tracking-tight"
              style={{
                fontFamily: "var(--theme-font-display, serif)",
                color: "var(--theme-text, #1d2a2a)",
              }}
            >
              {content.title}
            </h2>

            {content.storyParagraphs?.map((paragraph, idx) => (
              <p
                key={idx}
                data-animate
                className="text-base sm:text-lg leading-relaxed"
                style={{
                  fontFamily: "var(--theme-font-body, sans-serif)",
                  color: "var(--theme-muted, #586766)",
                }}
              >
                {paragraph}
              </p>
            ))}

            {content.missionStatement ? (
              <blockquote
                data-animate
                className="p-6 border-l-4 rounded-r-lg my-6"
                style={{
                  borderColor: "var(--theme-accent, #d6a24a)",
                  backgroundColor: "var(--theme-surface, #ffffff)",
                }}
              >
                <p
                  className="text-base font-medium italic"
                  style={{ color: "var(--theme-text, #1d2a2a)" }}
                >
                  &ldquo;{content.missionStatement}&rdquo;
                </p>
              </blockquote>
            ) : null}

            {content.ctaLabel && content.ctaRoute ? (
              <div data-animate className="pt-2">
                <Link
                  href={content.ctaRoute}
                  className="inline-flex items-center gap-2 text-sm font-semibold hover:opacity-85"
                  style={{ color: "var(--theme-primary, #174a50)" }}
                >
                  <span>{content.ctaLabel}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
