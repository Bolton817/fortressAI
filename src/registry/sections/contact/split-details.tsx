"use client";

import React from "react";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";
import { SectionComponentProps } from "@/registry/types";
import { SectionManifest } from "@/core/schema/manifest";
import { useSectionAnimation } from "@/registry/motion/use-animation";

export const contactSplitManifest: SectionManifest = {
  id: "contact.split-details",
  version: "1.0.0",
  label: "Split Contact Information & Inquiry Form",
  description: "Comprehensive contact section with verified physical/digital contact channels and accessible lead inquiry form.",
  pageTypes: ["contact", "home"],
  industries: ["general", "tourism", "consulting", "trades", "healthcare"],
  layoutType: "contact-split",
  contentSchemaVersion: "contact.split.v1",
  mediaSlots: [],
  animationPresets: ["fade-up"],
  accessibility: {
    semanticHeadingLevel: true,
    focusVisible: true,
    reducedMotionFallback: true,
  },
  export: {
    staticSafe: true,
    dependencies: ["contact-form"],
  },
  status: "released",
};

export interface ContactSplitContent {
  heading: string;
  subhead?: string;
  email?: string;
  phone?: string;
  location?: string;
  hours?: string;
  formSubmitLabel?: string;
}

export function ContactSplitSection({
  instanceId,
  content,
  animationPreset = "fade-up",
}: SectionComponentProps<ContactSplitContent>) {
  const containerRef = useSectionAnimation(animationPreset);

  return (
    <section
      id={instanceId}
      ref={containerRef}
      className="py-16 md:py-24"
      style={{ backgroundColor: "var(--theme-bg, #faf8f3)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left: Contact Info Channels */}
          <div className="lg:col-span-5 space-y-8">
            <div>
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
                <p data-animate className="text-lg mt-3" style={{ color: "var(--theme-muted, #586766)" }}>
                  {content.subhead}
                </p>
              ) : null}
            </div>

            <div data-animate className="space-y-6 pt-4">
              {content.email ? (
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-black/[0.04]">
                    <Mail className="w-5 h-5" style={{ color: "var(--theme-primary, #174a50)" }} />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--theme-muted, #586766)" }}>Email</h3>
                    <a href={`mailto:${content.email}`} className="text-base font-medium hover:underline" style={{ color: "var(--theme-text, #1d2a2a)" }}>
                      {content.email}
                    </a>
                  </div>
                </div>
              ) : null}

              {content.phone ? (
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-black/[0.04]">
                    <Phone className="w-5 h-5" style={{ color: "var(--theme-primary, #174a50)" }} />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--theme-muted, #586766)" }}>Phone</h3>
                    <a href={`tel:${content.phone}`} className="text-base font-medium hover:underline" style={{ color: "var(--theme-text, #1d2a2a)" }}>
                      {content.phone}
                    </a>
                  </div>
                </div>
              ) : null}

              {content.location ? (
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-black/[0.04]">
                    <MapPin className="w-5 h-5" style={{ color: "var(--theme-primary, #174a50)" }} />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--theme-muted, #586766)" }}>Location</h3>
                    <p className="text-base font-medium" style={{ color: "var(--theme-text, #1d2a2a)" }}>
                      {content.location}
                    </p>
                  </div>
                </div>
              ) : null}

              {content.hours ? (
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-black/[0.04]">
                    <Clock className="w-5 h-5" style={{ color: "var(--theme-primary, #174a50)" }} />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--theme-muted, #586766)" }}>Business Hours</h3>
                    <p className="text-base font-medium" style={{ color: "var(--theme-text, #1d2a2a)" }}>
                      {content.hours}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Right: Lead Inquiry Form */}
          <div className="lg:col-span-7">
            <div
              data-animate
              className="p-8 sm:p-10 rounded-2xl shadow-sm border"
              style={{
                backgroundColor: "var(--theme-surface, #ffffff)",
                borderColor: "var(--theme-border, #e2ddd3)",
                borderRadius: "var(--theme-radius-card, 1rem)",
              }}
            >
              <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="contact-name" className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--theme-muted, #586766)" }}>
                      Your Name
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      placeholder="Jane Doe"
                      className="w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2"
                      style={{
                        borderColor: "var(--theme-border, #e2ddd3)",
                        backgroundColor: "var(--theme-bg, #faf8f3)",
                        color: "var(--theme-text, #1d2a2a)",
                      }}
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-email" className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--theme-muted, #586766)" }}>
                      Email Address
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      placeholder="jane@example.com"
                      className="w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2"
                      style={{
                        borderColor: "var(--theme-border, #e2ddd3)",
                        backgroundColor: "var(--theme-bg, #faf8f3)",
                        color: "var(--theme-text, #1d2a2a)",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--theme-muted, #586766)" }}>
                    Inquiry Details
                  </label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    required
                    placeholder="Tell us about your requirements or dates..."
                    className="w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2"
                    style={{
                      borderColor: "var(--theme-border, #e2ddd3)",
                      backgroundColor: "var(--theme-bg, #faf8f3)",
                      color: "var(--theme-text, #1d2a2a)",
                    }}
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold shadow-md transition-all hover:opacity-95"
                  style={{
                    backgroundColor: "var(--theme-primary, #174a50)",
                    color: "#ffffff",
                    borderRadius: "var(--theme-radius-btn, 0.5rem)",
                  }}
                >
                  <span>{content.formSubmitLabel || "Send Message"}</span>
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
