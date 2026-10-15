import { z } from "zod";
import { createPromptContract } from "./prompt-contract";
import { BusinessBrief } from "@/core/schema/business-brief";

/**
 * Fortress AI — Launch Blog Drafts Prompt Contract (TDD §11.1 Stage E, §17.1, FR-027)
 * Generates 3 starter blog drafts with unique slugs, excerpts, and rich-text bodies.
 * Invariant: Articles default strictly to 'draft' status; never auto-published without user review.
 */

export const ArticleDraftSchema = z.object({
  title: z.string().min(5).max(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Must be a lowercase kebab-case slug"),
  excerpt: z.string().min(20).max(350),
  author: z.string().min(1).max(80),
  readTime: z.string().min(1).max(30),
  category: z.string().min(1).max(50),
  tags: z.array(z.string()).min(1).max(8),
  body: z.string().min(100).max(5000),
  status: z.literal("draft"),
});
export type ArticleDraft = z.infer<typeof ArticleDraftSchema>;

export const BlogBatchPlanSchema = z.object({
  articles: z.array(ArticleDraftSchema).length(3),
});
export type BlogBatchPlan = z.infer<typeof BlogBatchPlanSchema>;

export const blogArticlePromptContract = createPromptContract<ArticleDraft>({
  id: "prompt.blog-article.v1",
  version: "1.0.0",
  stage: "STAGE_E_BLOG_DRAFT",
  schema: ArticleDraftSchema,
  systemInstruction:
    "You are Fortress AI Content Strategist. Generate a compelling, high-quality industry blog article. Set status to 'draft'. Use valid markdown formatting for the body with H2/H3 headers. Never imply professional legal/medical advice.",
  renderPrompt: (params: { brief: BusinessBrief; topicIndex: number; topicFocus?: string }) => `
Business Name: ${params.brief.businessName}
Industry: ${params.brief.industry}
Location: ${params.brief.location.city}, ${params.brief.location.country}
Target Audience: ${params.brief.targetAudience}
Tone: ${params.brief.brandTone}
Article Position: ${params.topicIndex} of 3
Topic Focus: ${params.topicFocus || "Industry insights and practical client guidance"}

Draft a complete starter blog article:
- title: Engaging, SEO-friendly headline (6–12 words)
- slug: Lowercase kebab-case slug (e.g. "top-considerations-for-safari-planning")
- excerpt: 2–3 sentences summarizing the key takeaway
- author: "${params.brief.businessName} Team"
- readTime: e.g. "4 min read"
- category: "${params.brief.industry}"
- tags: 3–5 relevant industry tags
- body: Markdown formatted article with Introduction, 2–3 structured subheadings, and Conclusion
- status: "draft"
`,
});
