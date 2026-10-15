import { z } from "zod";
import { createPromptContract } from "./prompt-contract";
import { BusinessBrief } from "@/core/schema/business-brief";

/**
 * Fortress AI — Section Copy Prompt Contracts (TDD §12, §16, §40.4, FR-025)
 * Translates verified facts from BusinessBrief into exact Zod schemas per section variant.
 * Invariant: Never invent customer ratings, reviews, certifications, awards, or fake addresses.
 */

// 1. Hero Split Schema & Contract
export const HeroSplitContentSchema = z.object({
  headline: z.string().min(3).max(120),
  subhead: z.string().min(10).max(350),
  primaryCta: z.object({
    label: z.string().min(1).max(35),
    targetRoute: z.string().min(1),
  }),
  secondaryCta: z.object({
    label: z.string().min(1).max(35),
    targetRoute: z.string().min(1),
  }).optional(),
});
export type HeroSplitContent = z.infer<typeof HeroSplitContentSchema>;

export const heroSplitPromptContract = createPromptContract<HeroSplitContent>({
  id: "prompt.section.hero.split.v1",
  version: "1.0.0",
  stage: "STAGE_D_PAGE_COPY",
  schema: HeroSplitContentSchema,
  systemInstruction:
    "You are Fortress AI Copywriter. Generate compelling, factual headline and subhead for the Hero section. Use ONLY facts from the brief. Do not invent awards, customer counts, or guarantees.",
  renderPrompt: (brief: BusinessBrief) => `
Business Name: ${brief.businessName}
Industry: ${brief.industry}
Summary: ${brief.summary}
Location: ${brief.location.city}, ${brief.location.country}
Goal: ${brief.conversionGoal}
Tone: ${brief.brandTone}

Draft the Hero Split section content:
- headline: Punchy, memorable, stating the core value proposition (3–10 words)
- subhead: 1–2 clear sentences explaining who they serve and why they are trusted
- primaryCta: Action-oriented button label and target route (e.g., "/services" or "/contact")
- secondaryCta: Optional secondary action (e.g., "Contact Us" -> "/contact")
`,
});

// 2. Services Card Grid Schema & Contract
export const ServicesCardGridContentSchema = z.object({
  heading: z.string().min(3).max(80),
  intro: z.string().min(10).max(350),
  items: z.array(z.object({
    title: z.string().min(2).max(60),
    description: z.string().min(10).max(300),
    ctaLabel: z.string().min(1).max(35).optional(),
    targetRoute: z.string().optional(),
  })).min(2).max(8),
});
export type ServicesCardGridContent = z.infer<typeof ServicesCardGridContentSchema>;

export const servicesCardGridPromptContract = createPromptContract<ServicesCardGridContent>({
  id: "prompt.section.services.card-grid.v1",
  version: "1.0.0",
  stage: "STAGE_D_PAGE_COPY",
  schema: ServicesCardGridContentSchema,
  systemInstruction:
    "Generate structured copy for the services section. Every item must directly reflect the verified offerings in the business brief. Do not invent prices or false guarantees.",
  renderPrompt: (brief: BusinessBrief) => `
Business Name: ${brief.businessName}
Industry: ${brief.industry}
Location: ${brief.location.city}, ${brief.location.country}
Verified Offerings:
${brief.offerings.map((o) => `- ${o.name}: ${o.summary}`).join("\n")}

Draft the Services Card Grid section:
- heading: e.g., "Our Specialized Offerings" or "Professional Solutions"
- intro: 1–2 sentences setting the context and standards
- items: 2–6 service cards, each with title, description, and ctaLabel
`,
});

// 3. About Story Schema & Contract
export const AboutStoryContentSchema = z.object({
  heading: z.string().min(3).max(80),
  story: z.string().min(20).max(1200),
  missionQuote: z.string().min(10).max(250).optional(),
  stats: z.array(z.object({
    value: z.string().min(1).max(20),
    label: z.string().min(1).max(60),
  })).optional(),
});
export type AboutStoryContent = z.infer<typeof AboutStoryContentSchema>;

export const aboutStoryPromptContract = createPromptContract<AboutStoryContent>({
  id: "prompt.section.about.story.v1",
  version: "1.0.0",
  stage: "STAGE_D_PAGE_COPY",
  schema: AboutStoryContentSchema,
  systemInstruction:
    "Generate authentic About section copy. State the company mission and philosophy derived strictly from the brief. Do not fabricate founding years, staff counts, or credentials.",
  renderPrompt: (brief: BusinessBrief) => `
Business Name: ${brief.businessName}
Industry: ${brief.industry}
Summary: ${brief.summary}
Location: ${brief.location.city}, ${brief.location.country}
Tone: ${brief.brandTone}
Verified Metrics: ${JSON.stringify(brief.suppliedProof.metrics)}

Draft the About Story section:
- heading: e.g., "About ${brief.businessName}"
- story: 2–3 paragraphs explaining their commitment, expertise, and customer focus
- missionQuote: A concise, authentic mission statement
- stats: Only include verified metrics from the brief if provided
`,
});

// 4. Contact Details Schema & Contract
export const ContactDetailsContentSchema = z.object({
  heading: z.string().min(3).max(80),
  intro: z.string().min(10).max(300),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  hours: z.string().optional(),
});
export type ContactDetailsContent = z.infer<typeof ContactDetailsContentSchema>;

export const contactDetailsPromptContract = createPromptContract<ContactDetailsContent>({
  id: "prompt.section.contact.split-details.v1",
  version: "1.0.0",
  stage: "STAGE_D_PAGE_COPY",
  schema: ContactDetailsContentSchema,
  systemInstruction:
    "Generate contact section intro and headers. Use EXACT email, phone, and address from the brief. Never invent phone numbers or street addresses.",
  renderPrompt: (brief: BusinessBrief) => `
Business Name: ${brief.businessName}
City/Country: ${brief.location.city}, ${brief.location.country}
Address: ${brief.location.address || "By appointment / East Africa"}
Email: ${brief.contact.email || ""}
Phone: ${brief.contact.phone || ""}
Hours: ${brief.contact.hours || "Mon - Fri: 8:00 AM - 5:00 PM"}

Draft Contact Details section:
- heading: e.g., "Get in Touch with Our Team"
- intro: Warm, professional invitation to connect
- email: ${brief.contact.email || ""}
- phone: ${brief.contact.phone || ""}
- address: ${brief.location.address || `${brief.location.city}, ${brief.location.country}`}
- hours: ${brief.contact.hours || "Mon - Fri: 8:00 AM - 5:00 PM"}
`,
});

// 5. Proof / Social Proof Schemas (Strictly guarded)
export const ProofMetricsContentSchema = z.object({
  heading: z.string().min(3).max(80),
  intro: z.string().min(5).max(250).optional(),
  metrics: z.array(z.object({
    value: z.string().min(1).max(20),
    label: z.string().min(1).max(60),
    context: z.string().max(120).optional(),
  })).min(2).max(6),
});
export type ProofMetricsContent = z.infer<typeof ProofMetricsContentSchema>;

export const ProofTestimonialsContentSchema = z.object({
  heading: z.string().min(3).max(80),
  intro: z.string().min(5).max(250).optional(),
  testimonials: z.array(z.object({
    quote: z.string().min(5).max(300),
    authorName: z.string().min(1).max(80),
    authorTitle: z.string().max(80).optional(),
    company: z.string().max(80).optional(),
  })).min(1).max(6),
});
export type ProofTestimonialsContent = z.infer<typeof ProofTestimonialsContentSchema>;

// 6. FAQ Accordion Schema
export const FaqAccordionContentSchema = z.object({
  heading: z.string().min(3).max(80),
  intro: z.string().min(5).max(250).optional(),
  items: z.array(z.object({
    question: z.string().min(5).max(150),
    answer: z.string().min(10).max(500),
  })).min(3).max(8),
});
export type FaqAccordionContent = z.infer<typeof FaqAccordionContentSchema>;
