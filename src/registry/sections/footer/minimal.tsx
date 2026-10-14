"use client";

import React from "react";
import Link from "next/link";
import { SectionComponentProps } from "@/registry/types";
import { SectionManifest } from "@/core/schema/manifest";

export const footerMinimalManifest: SectionManifest = {
  id: "shell.footer.minimal",
  version: "1.0.0",
  label: "Compact Minimalist Footer",
  description: "Restrained single-row footer with inline navigation and copyright statement.",
  pageTypes: ["home", "about", "services", "contact", "blog"],
  industries: ["general", "creative", "consulting", "artisanal"],
  layoutType: "minimal-footer",
  contentSchemaVersion: "shell.footer.minimal.v1",
  mediaSlots: [],
  animationPresets: [],
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

export interface FooterMinimalContent {
  brandName: string;
  copyrightText: string;
  links: Array<{ label: string; href: string }>;
}

export function FooterMinimalSection({
  instanceId,
  content,
}: SectionComponentProps<FooterMinimalContent>) {
  return (
    <footer
      id={instanceId}
      className="py-10 border-t"
      style={{
        backgroundColor: "var(--theme-surface, #ffffff)",
        borderColor: "var(--theme-border, #e2ddd3)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm" style={{ color: "var(--theme-muted, #586766)" }}>
        <div className="font-semibold" style={{ color: "var(--theme-text, #1d2a2a)" }}>
          {content.brandName}
        </div>

        <nav aria-label="Footer Navigation" className="flex flex-wrap items-center gap-6">
          {content.links?.map((link, idx) => (
            <Link key={idx} href={link.href} className="hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="text-xs">
          {content.copyrightText}
        </div>
      </div>
    </footer>
  );
}
