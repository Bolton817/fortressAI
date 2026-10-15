"use client";

import React from "react";
import Link from "next/link";
import { Calendar, ArrowRight } from "lucide-react";
import { SectionComponentProps } from "@/registry/types";
import { SectionManifest } from "@/core/schema/manifest";
import { useSectionAnimation } from "@/registry/motion/use-animation";

export const blogIndexManifest: SectionManifest = {
  id: "blog.index",
  version: "1.0.0",
  label: "Article Directory & Blog Index",
  description: "Displays structured business insights and articles with categories, dates, and excerpts.",
  pageTypes: ["blog", "home"],
  industries: ["general", "tourism", "consulting", "technology", "healthcare"],
  layoutType: "blog-grid",
  contentSchemaVersion: "blog.index.v1",
  mediaSlots: [
    {
      slotId: "article_featured_image",
      required: false,
      aspectRatio: "16:9",
      acceptedSubjectTags: ["article", "hero", "card", "feature"],
      description: "Featured visual for the leading blog post.",
    },
  ],
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

export interface ArticleCard {
  title: string;
  slug: string;
  excerpt: string;
  category?: string;
  publishedDate?: string;
  readTime?: string;
}

export interface BlogIndexContent {
  heading: string;
  subhead?: string;
  articles: ArticleCard[];
}

export function BlogIndexSection({
  instanceId,
  content,
  assetBindings,
  animationPreset = "stagger-cards",
}: SectionComponentProps<BlogIndexContent>) {
  const containerRef = useSectionAnimation(animationPreset);
  const featuredMedia = assetBindings[0];

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
          {content.subhead ? (
            <p data-animate className="text-lg" style={{ color: "var(--theme-muted, #586766)" }}>
              {content.subhead}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {content.articles?.map((art, idx) => (
            <article
              key={idx}
              data-animate
              className="flex flex-col justify-between rounded-2xl border overflow-hidden shadow-sm transition-all hover:shadow-md"
              style={{
                backgroundColor: "var(--theme-bg, #faf8f3)",
                borderColor: "var(--theme-border, #e2ddd3)",
                borderRadius: "var(--theme-radius-card, 1rem)",
              }}
            >
              {idx === 0 && featuredMedia ? (
                <div className="aspect-video w-full overflow-hidden border-b" style={{ borderColor: "var(--theme-border, #e2ddd3)" }}>
                  <img src={featuredMedia.url} alt={art.title} className="w-full h-full object-cover" />
                </div>
              ) : null}

              <div className="p-8 space-y-4">
                <div className="flex items-center justify-between text-xs font-semibold" style={{ color: "var(--theme-muted, #586766)" }}>
                  {art.category ? (
                    <span className="uppercase tracking-wider px-2 py-0.5 rounded bg-white border" style={{ borderColor: "var(--theme-border, #e2ddd3)", color: "var(--theme-accent, #d6a24a)" }}>
                      {art.category}
                    </span>
                  ) : null}
                  {art.publishedDate ? (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{art.publishedDate}</span>
                    </span>
                  ) : null}
                </div>

                <h3
                  className="text-xl font-bold leading-snug"
                  style={{
                    fontFamily: "var(--theme-font-display, serif)",
                    color: "var(--theme-text, #1d2a2a)",
                  }}
                >
                  <Link href={(art as any).route || (art.slug ? `/blog/${art.slug}` : "#")} className="hover:underline">
                    {art.title}
                  </Link>
                </h3>

                <p className="text-sm leading-relaxed" style={{ color: "var(--theme-muted, #586766)" }}>
                  {art.excerpt}
                </p>
              </div>

              <div className="p-8 pt-0">
                <Link
                  href={(art as any).route || (art.slug ? `/blog/${art.slug}` : "#")}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-85"
                  style={{ color: "var(--theme-primary, #174a50)" }}
                >
                  <span>Read Article</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
