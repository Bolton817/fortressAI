"use client";

import React from "react";
import { SectionComponentProps } from "@/registry/types";
import { SectionManifest } from "@/core/schema/manifest";
import { useSectionAnimation } from "@/registry/motion/use-animation";

export const aboutTeamManifest: SectionManifest = {
  id: "about.team-grid",
  version: "1.0.0",
  label: "Executive Leadership & Team Grid",
  description: "Displays authentic profiles of founders and key leadership. Rendered only when team members are verified.",
  pageTypes: ["about"],
  industries: ["general", "consulting", "tourism", "healthcare", "creative"],
  layoutType: "team-grid",
  contentSchemaVersion: "about.team.v1",
  mediaSlots: [
    {
      slotId: "team_avatar",
      required: false,
      aspectRatio: "1:1",
      acceptedSubjectTags: ["avatar", "team", "founder"],
      description: "Square headshot of team member.",
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

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  avatarSlotId?: string;
}

export interface AboutTeamContent {
  headline: string;
  subhead?: string;
  members: TeamMember[];
}

export function AboutTeamSection({
  instanceId,
  content,
  assetBindings,
  animationPreset = "stagger-cards",
}: SectionComponentProps<AboutTeamContent>) {
  const containerRef = useSectionAnimation(animationPreset);

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
            {content.headline}
          </h2>
          {content.subhead ? (
            <p data-animate className="text-lg" style={{ color: "var(--theme-muted, #586766)" }}>
              {content.subhead}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {content.members?.map((member, idx) => {
            const avatar = assetBindings.find(
              (b) => b.slotId === (member.avatarSlotId || `team_avatar_${idx}`)
            ) || assetBindings[idx];

            return (
              <div
                key={idx}
                data-animate
                className="p-8 rounded-2xl border text-center space-y-4 shadow-sm"
                style={{
                  backgroundColor: "var(--theme-bg, #faf8f3)",
                  borderColor: "var(--theme-border, #e2ddd3)",
                  borderRadius: "var(--theme-radius-card, 1rem)",
                }}
              >
                <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-2 shadow-inner" style={{ borderColor: "var(--theme-accent, #d6a24a)" }}>
                  {avatar ? (
                    <img src={avatar.url} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-xl opacity-60 bg-white">
                      {member.name.charAt(0)}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-bold" style={{ color: "var(--theme-text, #1d2a2a)" }}>
                    {member.name}
                  </h3>
                  <p className="text-xs font-semibold uppercase tracking-wider mt-1" style={{ color: "var(--theme-primary, #174a50)" }}>
                    {member.role}
                  </p>
                </div>

                <p className="text-sm leading-relaxed" style={{ color: "var(--theme-muted, #586766)" }}>
                  {member.bio}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
