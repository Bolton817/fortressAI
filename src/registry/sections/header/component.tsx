"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { SectionComponentProps } from "@/registry/types";

export interface HeaderContent {
  brandName: string;
  links: Array<{ label: string; targetRoute: string; isButton?: boolean }>;
  ctaText?: string;
  ctaRoute?: string;
}

export function HeaderSection({
  instanceId,
  content,
  assetBindings,
}: SectionComponentProps<HeaderContent>) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const logoAsset = assetBindings.find((b) => b.slotId === "logo");

  return (
    <header
      id={instanceId}
      className="sticky top-0 z-50 w-full transition-colors border-b"
      style={{
        backgroundColor: "var(--theme-surface, #ffffff)",
        borderColor: "var(--theme-border, #e2e8f0)",
      }}
    >
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between"
      >
        {/* Brand / Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 text-xl font-bold tracking-tight focus:outline-none focus:ring-2 focus:ring-offset-2 rounded"
          style={{
            fontFamily: "var(--theme-font-display, inherit)",
            color: "var(--theme-primary, #0f172a)",
          }}
        >
          {logoAsset ? (
            <img
              src={logoAsset.url}
              alt={logoAsset.altText || content.brandName}
              className="h-10 w-auto object-contain"
            />
          ) : null}
          <span>{content.brandName}</span>
        </Link>

        {/* Desktop Navigation */}
        <nav
          aria-label="Main Navigation"
          className="hidden md:flex items-center gap-8"
        >
          {content.links?.map((link, idx) => (
            <Link
              key={idx}
              href={link.targetRoute}
              className="text-sm font-medium transition-colors hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 rounded px-2 py-1"
              style={{
                fontFamily: "var(--theme-font-body, inherit)",
                color: "var(--theme-text, #1e293b)",
              }}
            >
              {link.label}
            </Link>
          ))}

          {content.ctaText && content.ctaRoute ? (
            <Link
              href={content.ctaRoute}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                backgroundColor: "var(--theme-primary, #0f172a)",
                color: "#ffffff",
                borderRadius: "var(--theme-radius-btn, 0.375rem)",
              }}
            >
              {content.ctaText}
            </Link>
          ) : null}
        </nav>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-md focus:outline-none focus:ring-2"
          style={{ color: "var(--theme-text, #0f172a)" }}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          className="md:hidden border-b px-4 pt-2 pb-6 space-y-3"
          style={{
            backgroundColor: "var(--theme-surface, #ffffff)",
            borderColor: "var(--theme-border, #e2e8f0)",
          }}
        >
          {content.links?.map((link, idx) => (
            <Link
              key={idx}
              href={link.targetRoute}
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium py-2 px-3 rounded-md"
              style={{ color: "var(--theme-text, #1e293b)" }}
            >
              {link.label}
            </Link>
          ))}

          {content.ctaText && content.ctaRoute ? (
            <div className="pt-2">
              <Link
                href={content.ctaRoute}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center w-full py-2.5 px-4 text-sm font-medium shadow-sm"
                style={{
                  backgroundColor: "var(--theme-primary, #0f172a)",
                  color: "#ffffff",
                  borderRadius: "var(--theme-radius-btn, 0.375rem)",
                }}
              >
                {content.ctaText}
              </Link>
            </div>
          ) : null}
        </div>
      )}
    </header>
  );
}
