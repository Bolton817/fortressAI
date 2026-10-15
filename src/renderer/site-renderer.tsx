"use client";

import React from "react";
import { SiteConfiguration, PageRoute } from "@/core/schema/site-config";
import { resolveTheme, themeTokensToCssVariables } from "@/themes/default-themes";
import { sectionRegistry } from "@/registry";

export interface SiteRendererProps {
  config: SiteConfiguration;
  currentSlug?: string;
  linkPrefix?: string;
}

function prefixRoute(route?: string, prefix?: string): string | undefined {
  if (!route || !prefix) return route;
  if (
    route.startsWith("http") ||
    route.startsWith("mailto:") ||
    route.startsWith("tel:") ||
    route.startsWith("#")
  ) {
    return route;
  }
  const clean = route === "/" ? "" : route;
  return `${prefix}${clean}`;
}

function rewriteContentLinks(content: any, prefix?: string): any {
  if (!prefix || !content) return content;
  const clone = { ...content };

  if (clone.ctaRoute) clone.ctaRoute = prefixRoute(clone.ctaRoute, prefix);
  if (clone.primaryCtaRoute) clone.primaryCtaRoute = prefixRoute(clone.primaryCtaRoute, prefix);
  if (clone.secondaryCtaRoute) clone.secondaryCtaRoute = prefixRoute(clone.secondaryCtaRoute, prefix);

  if (Array.isArray(clone.links)) {
    clone.links = clone.links.map((l: any) => {
      const rawTarget = l.href || l.targetRoute || l.route;
      const prefixed = prefixRoute(rawTarget, prefix) || rawTarget || "#";
      return {
        ...l,
        targetRoute: l.targetRoute ? (prefixRoute(l.targetRoute, prefix) || "#") : prefixed,
        href: l.href ? (prefixRoute(l.href, prefix) || "#") : prefixed,
      };
    });
  }

  if (Array.isArray(clone.items)) {
    clone.items = clone.items.map((item: any) => ({
      ...item,
      targetRoute: prefixRoute(item.targetRoute, prefix),
      route: prefixRoute(item.route, prefix),
    }));
  }

  if (Array.isArray(clone.columns)) {
    clone.columns = clone.columns.map((col: any) => ({
      ...col,
      links: Array.isArray(col.links)
        ? col.links.map((l: any) => ({ ...l, href: prefixRoute(l.href, prefix) }))
        : col.links,
    }));
  }

  return clone;
}

export function SiteRenderer({ config, currentSlug = "/", linkPrefix }: SiteRendererProps) {
  // Resolve theme and CSS variables (TDD §10)
  const resolvedTheme = resolveTheme(config.theme.themeId, config.theme.tokenOverrides);
  const cssVariables = themeTokensToCssVariables(resolvedTheme);

  // Locate the target page by slug
  const page: PageRoute | undefined =
    config.pages.find((p) => p.slug === currentSlug) || config.pages[0];

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <div>
          <h2 className="text-2xl font-bold">Page Not Found</h2>
          <p className="text-muted-foreground mt-2">The requested page does not exist on this website.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col font-sans transition-colors"
      style={{
        ...cssVariables,
        backgroundColor: "var(--theme-bg, #faf8f3)",
        color: "var(--theme-text, #1d2a2a)",
        fontFamily: "var(--theme-font-body, system-ui, sans-serif)",
      } as React.CSSProperties}
    >
      {/* Dynamic Section Sequence */}
      <main className="flex-grow">
        {page.sections
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((sec) => {
            try {
              const entry = sectionRegistry.getEntry(sec.sectionId);
              const Component = entry.component;
              const preparedContent = rewriteContentLinks(sec.content, linkPrefix);

              return (
                <Component
                  key={sec.instanceId}
                  instanceId={sec.instanceId}
                  content={preparedContent}
                  assetBindings={sec.assetBindings || []}
                  animationPreset={sec.animationPresetOverride}
                  settings={sec.settings}
                />
              );
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Section error";
              return (
                <div
                  key={sec.instanceId}
                  className="p-6 m-4 border-2 border-dashed border-amber-300 rounded-lg text-sm text-amber-800 bg-amber-50"
                >
                  <p className="font-semibold">Section fallback: {sec.sectionId}</p>
                  <p className="text-xs opacity-75">{msg}</p>
                </div>
              );
            }
          })}
      </main>
    </div>
  );
}
