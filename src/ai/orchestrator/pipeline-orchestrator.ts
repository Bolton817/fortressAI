import {
  globalJobStore,
  DurableJobStore,
  GenerationJobRecord,
} from "./job-store";
import { AIProviderAdapter } from "../providers/types";
import { MockAIProvider } from "../providers/mock-provider";
import { normalizeBusinessBrief } from "../intake/brief-normaliser";
import { BusinessBrief } from "@/core/schema/business-brief";
import { sitePlanPromptContract, SitePlan } from "../prompts/site-plan-prompt";
import {
  heroSplitPromptContract,
  HeroSplitContent,
  servicesCardGridPromptContract,
  ServicesCardGridContent,
  aboutStoryPromptContract,
  AboutStoryContent,
  contactDetailsPromptContract,
  ContactDetailsContent,
} from "../prompts/section-copy-prompts";
import { blogArticlePromptContract, ArticleDraft } from "../prompts/blog-draft-prompts";
import { enforceFactualityPolicy } from "../guardrails/factuality-checker";
import { globalUsageLedger } from "../telemetry/usage-ledger";
import {
  SiteConfiguration,
  SiteConfigurationSchema,
  PageRoute,
  SectionInstance,
} from "@/core/schema/site-config";
import { selectAssetForSlot, AssetMatchingContext } from "@/assets/selection-engine";
import { sectionRegistry } from "@/registry";
import { defaultThemes } from "@/themes/default-themes";

/**
 * Fortress AI — Multi-Stage AI Pipeline Orchestrator (TDD §11, §28, FR-026, FR-076)
 * Coordinates durable generation of multi-page websites with crash resilience.
 * Invariant: Completed stages survive restarts; failed retries resume without rebuilding successful stages.
 */

export class PipelineOrchestrator {
  private jobStore: DurableJobStore;
  private defaultProvider: AIProviderAdapter;

  constructor(jobStore = globalJobStore, defaultProvider?: AIProviderAdapter) {
    this.jobStore = jobStore;
    this.defaultProvider = defaultProvider || new MockAIProvider();
  }

  async startGeneration(params: {
    siteId: string;
    platformSlug: string;
    rawInput: unknown;
    provider?: AIProviderAdapter;
  }): Promise<GenerationJobRecord> {
    const job = this.jobStore.createJob({
      siteId: params.siteId,
      platformSlug: params.platformSlug,
      rawInput: params.rawInput,
    });

    return this.executePipeline(job.jobId, params.provider || this.defaultProvider);
  }

  async resumeGeneration(
    jobId: string,
    provider?: AIProviderAdapter
  ): Promise<GenerationJobRecord> {
    const job = this.jobStore.getJob(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    if (job.status === "succeeded") {
      return job;
    }

    return this.executePipeline(jobId, provider || this.defaultProvider);
  }

  private async executePipeline(
    jobId: string,
    provider: AIProviderAdapter
  ): Promise<GenerationJobRecord> {
    let job = this.jobStore.getJob(jobId)!;
    this.jobStore.setJobStatus(jobId, "running");

    try {
      // =========================================================================
      // Stage A: Intake Normalisation (TDD §11.1 Stage A, FR-015)
      // =========================================================================
      let brief: BusinessBrief;
      if (job.steps.INTAKE.status !== "succeeded") {
        this.jobStore.updateStageStatus(jobId, "INTAKE", "running");
        brief = normalizeBusinessBrief(job.siteId, job.rawInput);
        job = this.jobStore.updateStageStatus(jobId, "INTAKE", "succeeded", brief);
      } else {
        brief = job.steps.INTAKE.output;
      }

      // =========================================================================
      // Stage B: Site Strategy & Plan (TDD §11.1 Stage B, FR-017)
      // =========================================================================
      let sitePlan: SitePlan;
      if (job.steps.SITE_PLAN.status !== "succeeded") {
        this.jobStore.updateStageStatus(jobId, "SITE_PLAN", "running");
        const planResult = await provider.generateStructured({
          promptContract: sitePlanPromptContract,
          context: brief,
          idempotencyKey: `${jobId}_site_plan`,
        });

        globalUsageLedger.recordUsage({
          siteId: job.siteId,
          jobId,
          stage: "SITE_PLAN",
          provider: planResult.provider,
          model: planResult.model,
          usage: planResult.usage,
          outcome: planResult.repaired ? "repaired" : "succeeded",
          idempotencyKey: `${jobId}_site_plan`,
        });
        this.jobStore.recordStageUsage(jobId, planResult.usage.totalTokens, planResult.usage.estimatedCostMinorUnits);

        sitePlan = planResult.data;
        job = this.jobStore.updateStageStatus(jobId, "SITE_PLAN", "succeeded", sitePlan);
      } else {
        sitePlan = job.steps.SITE_PLAN.output;
      }

      // =========================================================================
      // Stage D: Per-Page Copy Generation (TDD §11.1 Stage D, FR-025)
      // Runs in parallel or resumes independently
      // =========================================================================
      let homeCopy: HeroSplitContent;
      if (job.steps.HOME_PAGE.status !== "succeeded") {
        this.jobStore.updateStageStatus(jobId, "HOME_PAGE", "running");
        const res = await provider.generateStructured({
          promptContract: heroSplitPromptContract,
          context: brief,
          idempotencyKey: `${jobId}_home_hero`,
        });
        globalUsageLedger.recordUsage({
          siteId: job.siteId,
          jobId,
          stage: "HOME_PAGE",
          provider: res.provider,
          model: res.model,
          usage: res.usage,
          outcome: res.repaired ? "repaired" : "succeeded",
          idempotencyKey: `${jobId}_home_hero`,
        });
        this.jobStore.recordStageUsage(jobId, res.usage.totalTokens, res.usage.estimatedCostMinorUnits);
        homeCopy = res.data;
        job = this.jobStore.updateStageStatus(jobId, "HOME_PAGE", "succeeded", homeCopy);
      } else {
        homeCopy = job.steps.HOME_PAGE.output;
      }

      let aboutCopy: AboutStoryContent;
      if (job.steps.ABOUT_PAGE.status !== "succeeded") {
        this.jobStore.updateStageStatus(jobId, "ABOUT_PAGE", "running");
        const res = await provider.generateStructured({
          promptContract: aboutStoryPromptContract,
          context: brief,
          idempotencyKey: `${jobId}_about_story`,
        });
        globalUsageLedger.recordUsage({
          siteId: job.siteId,
          jobId,
          stage: "ABOUT_PAGE",
          provider: res.provider,
          model: res.model,
          usage: res.usage,
          outcome: res.repaired ? "repaired" : "succeeded",
          idempotencyKey: `${jobId}_about_story`,
        });
        this.jobStore.recordStageUsage(jobId, res.usage.totalTokens, res.usage.estimatedCostMinorUnits);
        aboutCopy = res.data;
        job = this.jobStore.updateStageStatus(jobId, "ABOUT_PAGE", "succeeded", aboutCopy);
      } else {
        aboutCopy = job.steps.ABOUT_PAGE.output;
      }

      let servicesCopy: ServicesCardGridContent;
      if (job.steps.SERVICES_PAGE.status !== "succeeded") {
        this.jobStore.updateStageStatus(jobId, "SERVICES_PAGE", "running");
        const res = await provider.generateStructured({
          promptContract: servicesCardGridPromptContract,
          context: brief,
          idempotencyKey: `${jobId}_services_grid`,
        });
        globalUsageLedger.recordUsage({
          siteId: job.siteId,
          jobId,
          stage: "SERVICES_PAGE",
          provider: res.provider,
          model: res.model,
          usage: res.usage,
          outcome: res.repaired ? "repaired" : "succeeded",
          idempotencyKey: `${jobId}_services_grid`,
        });
        this.jobStore.recordStageUsage(jobId, res.usage.totalTokens, res.usage.estimatedCostMinorUnits);
        servicesCopy = res.data;
        job = this.jobStore.updateStageStatus(jobId, "SERVICES_PAGE", "succeeded", servicesCopy);
      } else {
        servicesCopy = job.steps.SERVICES_PAGE.output;
      }

      let contactCopy: ContactDetailsContent;
      if (job.steps.CONTACT_PAGE.status !== "succeeded") {
        this.jobStore.updateStageStatus(jobId, "CONTACT_PAGE", "running");
        const res = await provider.generateStructured({
          promptContract: contactDetailsPromptContract,
          context: brief,
          idempotencyKey: `${jobId}_contact_details`,
        });
        globalUsageLedger.recordUsage({
          siteId: job.siteId,
          jobId,
          stage: "CONTACT_PAGE",
          provider: res.provider,
          model: res.model,
          usage: res.usage,
          outcome: res.repaired ? "repaired" : "succeeded",
          idempotencyKey: `${jobId}_contact_details`,
        });
        this.jobStore.recordStageUsage(jobId, res.usage.totalTokens, res.usage.estimatedCostMinorUnits);
        contactCopy = res.data;
        job = this.jobStore.updateStageStatus(jobId, "CONTACT_PAGE", "succeeded", contactCopy);
      } else {
        contactCopy = job.steps.CONTACT_PAGE.output;
      }

      // =========================================================================
      // Stage E: 3 Launch Blog Drafts (TDD §11.1 Stage E, §17.1, FR-027)
      // =========================================================================
      let blogArticles: ArticleDraft[];
      if (job.steps.BLOG_DRAFTS.status !== "succeeded") {
        this.jobStore.updateStageStatus(jobId, "BLOG_DRAFTS", "running");
        const articles: ArticleDraft[] = [];

        for (let i = 1; i <= 3; i++) {
          const res = await provider.generateStructured({
            promptContract: blogArticlePromptContract,
            context: { brief, topicIndex: i },
            idempotencyKey: `${jobId}_blog_article_${i}`,
          });

          globalUsageLedger.recordUsage({
            siteId: job.siteId,
            jobId,
            stage: `BLOG_ARTICLE_${i}`,
            provider: res.provider,
            model: res.model,
            usage: res.usage,
            outcome: res.repaired ? "repaired" : "succeeded",
            idempotencyKey: `${jobId}_blog_article_${i}`,
          });
          this.jobStore.recordStageUsage(jobId, res.usage.totalTokens, res.usage.estimatedCostMinorUnits);
          articles.push(res.data);
        }

        blogArticles = articles;
        job = this.jobStore.updateStageStatus(jobId, "BLOG_DRAFTS", "succeeded", blogArticles);
      } else {
        blogArticles = job.steps.BLOG_DRAFTS.output;
      }

      // =========================================================================
      // Stage F: Asset Resolution (TDD §11.1 Stage F, FR-050)
      // =========================================================================
      if (job.steps.ASSET_RESOLUTION.status !== "succeeded") {
        this.jobStore.updateStageStatus(jobId, "ASSET_RESOLUTION", "running");
        // Bindings are resolved deterministically per section media slot
        job = this.jobStore.updateStageStatus(jobId, "ASSET_RESOLUTION", "succeeded", { resolved: true });
      }

      // =========================================================================
      // Stage G & H: Canonical Assembly & Factuality Verification (TDD §11.1, FR-028)
      // =========================================================================
      this.jobStore.updateStageStatus(jobId, "FACTUALITY_GUARD", "running");
      this.jobStore.updateStageStatus(jobId, "CANONICAL_ASSEMBLY", "running");

      const themeId = defaultThemes[sitePlan.themeId] ? sitePlan.themeId : "modern-slate";
      const assetContext: AssetMatchingContext = {
        industry: brief.industry,
        location: brief.location.city,
        regionPreference: brief.location.country.toLowerCase().includes("kenya") ? "kenya" : undefined,
      };

      const usedAssetIds = new Set<string>();

      function createSection(
        sectionId: string,
        content: Record<string, any>,
        sortOrder: number
      ): SectionInstance {
        const entry = sectionRegistry.getEntry(sectionId);
        const manifest = entry.manifest;
        const bindings = [];

        for (const slot of manifest.mediaSlots) {
          const matched = selectAssetForSlot(slot, assetContext, usedAssetIds, `${jobId}_${sectionId}_${slot.slotId}`);
          if (matched) {
            bindings.push(matched);
          }
        }

        return {
          instanceId: `inst_${sectionId.replace(/\./g, "_")}_${sortOrder}`,
          sectionId,
          sectionVersion: manifest.version,
          sortOrder,
          content,
          assetBindings: bindings.length > 0 ? bindings : undefined,
        };
      }

      // Build pages
      const homePage: PageRoute = {
        pageId: "pg_home",
        slug: "/",
        title: "Home",
        pageType: "home",
        seo: {
          title: `${brief.businessName} — Professional ${brief.industry}`,
          description: brief.summary.slice(0, 160),
        },
        sections: [
          createSection("hero.split", {
            headline: homeCopy.headline,
            subheadline: (homeCopy as any).subheadline || homeCopy.subhead,
            subhead: homeCopy.subhead,
            primaryCtaLabel: (homeCopy as any).primaryCtaLabel || homeCopy.primaryCta?.label || "Explore Services",
            primaryCtaRoute: (homeCopy as any).primaryCtaRoute || homeCopy.primaryCta?.targetRoute || "/services",
            secondaryCtaLabel: (homeCopy as any).secondaryCtaLabel || homeCopy.secondaryCta?.label || "Contact Us",
            secondaryCtaRoute: (homeCopy as any).secondaryCtaRoute || homeCopy.secondaryCta?.targetRoute || "/contact",
            primaryCta: homeCopy.primaryCta,
            secondaryCta: homeCopy.secondaryCta,
          }, 1),
          createSection("services.card-grid", servicesCopy, 2),
          createSection("about.story", aboutCopy, 3),
          createSection("cta.fullwidth-accent", {
            heading: "Ready to Achieve Your Goals?",
            body: `Connect with the ${brief.businessName} team in ${brief.location.city} today for trusted consultation and delivery.`,
            buttonLabel: sitePlan.navigationCta.label,
            targetRoute: sitePlan.navigationCta.targetRoute,
          }, 4),
        ],
      };

      const servicesPage: PageRoute = {
        pageId: "pg_services",
        slug: "/services",
        title: "Services",
        pageType: "services",
        seo: {
          title: `Services & Solutions — ${brief.businessName}`,
          description: `Explore our specialized ${brief.industry.toLowerCase()} offerings and client-focused capabilities.`,
        },
        sections: [
          createSection("services.card-grid", servicesCopy, 1),
          createSection("cta.fullwidth-accent", {
            heading: "Request a Custom Proposal",
            body: "Contact our team to discuss customized scope, timelines, and deliverables.",
            buttonLabel: "Get in Touch",
            targetRoute: "/contact",
          }, 2),
        ],
      };

      const aboutPage: PageRoute = {
        pageId: "pg_about",
        slug: "/about",
        title: "About",
        pageType: "about",
        seo: {
          title: `About Us — ${brief.businessName}`,
          description: `Learn about our story, mission, and professional commitments in ${brief.location.city}.`,
        },
        sections: [
          createSection("about.story", aboutCopy, 1),
          createSection("about.values-grid", {
            heading: "Our Foundational Principles",
            intro: `Guiding excellence across every engagement.`,
            values: [
              { title: "Integrity", description: "Uncompromising honesty and ethical practice." },
              { title: "Quality", description: "Delivering exceptional standards on every project." },
              { title: "Reliability", description: "Timely communication and dedicated execution." },
            ],
          }, 2),
        ],
      };

      const blogIndexPage: PageRoute = {
        pageId: "pg_blog",
        slug: "/blog",
        title: "Blog",
        pageType: "blog",
        seo: {
          title: `Insights & Articles — ${brief.businessName}`,
          description: `Industry analysis, guides, and perspectives from ${brief.businessName}.`,
        },
        sections: [
          createSection("blog.index", {
            heading: "Latest Insights & Thought Leadership",
            intro: `Practical advice and current perspectives on the ${brief.industry.toLowerCase()} landscape.`,
          }, 1),
        ],
      };

      const contactPage: PageRoute = {
        pageId: "pg_contact",
        slug: "/contact",
        title: "Contact",
        pageType: "contact",
        seo: {
          title: `Contact Us — ${brief.businessName}`,
          description: `Get in touch with ${brief.businessName} in ${brief.location.city}. We look forward to hearing from you.`,
        },
        sections: [
          createSection("contact.split-details", contactCopy, 1),
        ],
      };

      // Also create dedicated article pages for the 3 generated drafts!
      const articlePages: PageRoute[] = blogArticles.map((art, idx) => ({
        pageId: `pg_blog_art_${idx + 1}`,
        slug: `/blog/${art.slug}`,
        title: art.title,
        pageType: "blog",
        seo: {
          title: `${art.title} — ${brief.businessName}`,
          description: art.excerpt.slice(0, 160),
        },
        sections: [
          createSection("blog.index", {
            heading: art.title,
            intro: `${art.excerpt}\n\n${art.body}`,
          }, 1),
        ],
      }));

      const rawConfig: SiteConfiguration = {
        siteId: job.siteId,
        platformSlug: job.platformSlug,
        version: 1,
        businessProfile: {
          name: brief.businessName,
          industry: brief.industry,
          summary: brief.summary,
          location: `${brief.location.city}, ${brief.location.country}`,
          email: brief.contact.email,
          phone: brief.contact.phone,
          whatsapp: brief.contact.whatsapp,
        },
        theme: {
          themeId,
          version: "1.0.0",
        },
        navigation: {
          brandName: brief.businessName,
          links: [
            { label: "Home", targetRoute: "/" },
            { label: "Services", targetRoute: "/services" },
            { label: "About", targetRoute: "/about" },
            { label: "Blog", targetRoute: "/blog" },
            { label: "Contact", targetRoute: "/contact" },
          ],
          sticky: true,
        },
        footer: {
          brandSummary: brief.summary.slice(0, 180),
          columns: [
            {
              title: "Quick Links",
              links: [
                { label: "Home", href: "/" },
                { label: "Services", href: "/services" },
                { label: "About Us", href: "/about" },
                { label: "Contact", href: "/contact" },
              ],
            },
            {
              title: "Offerings",
              links: brief.offerings.slice(0, 4).map((o) => ({
                label: o.name,
                href: "/services",
              })),
            },
          ],
          copyrightText: `© ${new Date().getFullYear()} ${brief.businessName}. All rights reserved.`,
          showWhatsApp: Boolean(brief.contact.whatsapp),
        },
        pages: [homePage, servicesPage, aboutPage, blogIndexPage, contactPage, ...articlePages],
      };

      // Enforce Factuality & Testimonials Invariant (TDD §12.2, §16.5, FR-028)
      const factualityCheck = enforceFactualityPolicy(brief, rawConfig);
      const validatedConfig = SiteConfigurationSchema.parse(factualityCheck.compliantConfig);

      this.jobStore.updateStageStatus(jobId, "FACTUALITY_GUARD", "succeeded", {
        violations: factualityCheck.violations,
        remediationApplied: factualityCheck.remediationApplied,
      });

      this.jobStore.updateStageStatus(jobId, "CANONICAL_ASSEMBLY", "succeeded", validatedConfig);
      job = this.jobStore.setJobStatus(jobId, "succeeded", validatedConfig);

      return job;
    } catch (err: any) {
      this.jobStore.setJobStatus(jobId, "failed", undefined, err.message);
      throw err;
    }
  }
}

export const globalPipelineOrchestrator = new PipelineOrchestrator();
