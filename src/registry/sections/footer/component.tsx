"use client";

import React from "react";
import Link from "next/link";
import { MessageCircle, Mail, Phone, MapPin } from "lucide-react";
import { SectionComponentProps } from "@/registry/types";

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface FooterContent {
  brandName: string;
  brandSummary: string;
  columns: FooterColumn[];
  contactInfo?: {
    email?: string;
    phone?: string;
    whatsapp?: string;
    location?: string;
  };
  copyrightText: string;
  showWhatsAppFloat?: boolean;
}

export function FooterSection({
  instanceId,
  content,
}: SectionComponentProps<FooterContent>) {
  return (
    <>
      <footer
        id={instanceId}
        className="w-full border-t transition-colors pt-16 pb-12"
        style={{
          backgroundColor: "var(--theme-surface, #ffffff)",
          borderColor: "var(--theme-border, #e2ddd3)",
          color: "var(--theme-text, #1d2a2a)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b" style={{ borderColor: "var(--theme-border, #e2ddd3)" }}>
            {/* Column 1: Brand & Summary */}
            <div className="space-y-4">
              <h3
                className="text-lg font-bold tracking-tight"
                style={{
                  fontFamily: "var(--theme-font-display, serif)",
                  color: "var(--theme-primary, #174a50)",
                }}
              >
                {content.brandName}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{
                  fontFamily: "var(--theme-font-body, sans-serif)",
                  color: "var(--theme-muted, #586766)",
                }}
              >
                {content.brandSummary}
              </p>
            </div>

            {/* Dynamic Link Columns */}
            {content.columns?.map((col, idx) => (
              <div key={idx} className="space-y-4">
                <h4 className="text-sm font-semibold tracking-wider uppercase" style={{ color: "var(--theme-text, #1d2a2a)" }}>
                  {col.title}
                </h4>
                <ul className="space-y-2.5">
                  {col.links?.map((link, lIdx) => (
                    <li key={lIdx}>
                      <Link
                        href={link.href || (link as any).targetRoute || "#"}
                        className="text-sm transition-colors hover:opacity-80"
                        style={{ color: "var(--theme-muted, #586766)" }}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Column 4: Contact details */}
            {content.contactInfo ? (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold tracking-wider uppercase" style={{ color: "var(--theme-text, #1d2a2a)" }}>
                  Direct Contact
                </h4>
                <ul className="space-y-2 text-sm" style={{ color: "var(--theme-muted, #586766)" }}>
                  {content.contactInfo.email ? (
                    <li className="flex items-center gap-2">
                      <Mail className="w-4 h-4 shrink-0" />
                      <a href={`mailto:${content.contactInfo.email}`} className="hover:underline">
                        {content.contactInfo.email}
                      </a>
                    </li>
                  ) : null}
                  {content.contactInfo.phone ? (
                    <li className="flex items-center gap-2">
                      <Phone className="w-4 h-4 shrink-0" />
                      <a href={`tel:${content.contactInfo.phone}`} className="hover:underline">
                        {content.contactInfo.phone}
                      </a>
                    </li>
                  ) : null}
                  {content.contactInfo.location ? (
                    <li className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span>{content.contactInfo.location}</span>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </div>

          {/* Bottom Copyright */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs gap-4" style={{ color: "var(--theme-muted, #586766)" }}>
            <p>{content.copyrightText}</p>
            <p>Powered by Fortress AI</p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Action Button (FR-040) */}
      {content.showWhatsAppFloat && content.contactInfo?.whatsapp ? (
        <a
          href={`https://wa.me/${content.contactInfo.whatsapp.replace(/[^0-9]/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          className="fixed bottom-6 right-6 z-40 p-3.5 rounded-full shadow-xl transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center"
          style={{
            backgroundColor: "#25D366",
            color: "#ffffff",
          }}
        >
          <MessageCircle className="w-6 h-6 fill-current" />
        </a>
      ) : null}
    </>
  );
}
