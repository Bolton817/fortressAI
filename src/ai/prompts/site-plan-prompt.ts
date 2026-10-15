import { z } from "zod";
import { createPromptContract } from "./prompt-contract";
import { BusinessBrief } from "@/core/schema/business-brief";

/**
 * Fortress AI — Site Strategy & Plan Prompt Contract (TDD §40.3, FR-017)
 * Proposes theme, sitemap routes, and conversion goals based on BusinessBrief.
 * Invariant: Can only recommend approved themes and supported core routes.
 */

export const SitePlanSchema = z.object({
  themeId: z.string().min(1),
  routes: z.array(z.string()).min(1),
  conversionGoal: z.string().min(1),
  navigationCta: z.object({
    label: z.string().min(1),
    targetRoute: z.string().min(1),
  }),
});
export type SitePlan = z.infer<typeof SitePlanSchema>;

export const sitePlanPromptContract = createPromptContract<SitePlan>({
  id: "prompt.site-plan.v1",
  version: "1.0.0",
  stage: "STAGE_B_SITE_PLAN",
  schema: SitePlanSchema,
  systemInstruction:
    "You are Fortress AI Site Strategy Planner. Output ONLY valid JSON matching the schema. Select from available theme IDs: ['warm-editorial', 'modern-slate', 'bold-craft', 'vibrant-pulse', 'ocean-minimal', 'heritage-luxury']. Never invent arbitrary theme IDs or invalid URL routes.",
  renderPrompt: (brief: BusinessBrief) => {
    return `Plan the site strategy for the following business:
Business Name: ${brief.businessName}
Industry: ${brief.industry}
Summary: ${brief.summary}
City/Country: ${brief.location.city}, ${brief.location.country}
Conversion Goal: ${brief.conversionGoal}
Brand Tone: ${brief.brandTone}
Offerings Count: ${brief.offerings.length}
Preferred Theme: ${brief.preferredThemeId || "None specified"}

Approved Themes:
- warm-editorial: Safari, hospitality, artisanal, nature, warm photography
- modern-slate: Corporate advisory, technology, legal, consulting
- bold-craft: Builders, trades, craftsmanship, construction, architecture
- vibrant-pulse: Creative agencies, digital products, entertainment, marketing
- ocean-minimal: Wellness, healthcare, clean clinics, boutique retail

Required Output Format:
{
  "themeId": "<one of approved themes>",
  "routes": ["/", "/about", "/services", "/blog", "/contact"],
  "conversionGoal": "${brief.conversionGoal}",
  "navigationCta": {
    "label": "<Action-oriented label based on goal>",
    "targetRoute": "/contact"
  }
}`;
  },
});
