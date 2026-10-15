import {
  AIProviderAdapter,
  GenerateStructuredParams,
  StructuredGenerationResult,
} from "./types";
import { parseAndValidate, buildRepairPrompt } from "./repair-engine";
import { SchemaValidationError } from "@/core/errors";

/**
 * Fortress AI — Deterministic Synthetic Mock Provider (TDD §6, §33.1)
 * Used in CI/CD, local development, and automated test suites.
 * Produces deterministic, schema-valid data based on the business context.
 */

export interface MockProviderOptions {
  latencyMs?: number;
  simulateFailureOnce?: boolean;
  simulateMalformedJsonOnce?: boolean;
  simulateSchemaErrorOnce?: boolean;
}

export class MockAIProvider implements AIProviderAdapter {
  readonly id = "mock-provider";
  readonly name = "Fortress Deterministic Synthetic Provider";
  readonly defaultModel = "mock-turbo-2026";

  private options: MockProviderOptions;
  private failureTriggered = false;
  private malformedTriggered = false;
  private schemaErrorTriggered = false;

  constructor(options: MockProviderOptions = {}) {
    this.options = options;
  }

  setOptions(options: MockProviderOptions) {
    this.options = { ...this.options, ...options };
  }

  resetTriggers() {
    this.failureTriggered = false;
    this.malformedTriggered = false;
    this.schemaErrorTriggered = false;
  }

  async generateStructured<T>(
    params: GenerateStructuredParams<T>
  ): Promise<StructuredGenerationResult<T>> {
    const startTime = Date.now();

    if (this.options.latencyMs && this.options.latencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.options.latencyMs));
    }

    // 1. Simulate Transient Failure if requested
    if (this.options.simulateFailureOnce && !this.failureTriggered) {
      this.failureTriggered = true;
      throw new Error("Simulated 503 Service Unavailable / Rate Limit Exceeded");
    }

    let repairAttempts = 0;
    let wasRepaired = false;

    // 2. Generate initial payload based on contract ID
    let rawPayload = this.generateSyntheticPayload(params.promptContract.id, params.context);

    // Simulate Malformed JSON if requested
    if (this.options.simulateMalformedJsonOnce && !this.malformedTriggered) {
      this.malformedTriggered = true;
      rawPayload = "INVALID JSON { unclosed string...";
    } else if (this.options.simulateSchemaErrorOnce && !this.schemaErrorTriggered) {
      this.schemaErrorTriggered = true;
      // Corrupt a required field
      rawPayload = JSON.stringify({ corrupted: true, missingRequired: true });
    }

    // 3. Validation and Bounded Repair Pass (FR-029)
    let validation = parseAndValidate<T>(rawPayload, params.promptContract.schema);

    if (!validation.success) {
      // Execute bounded repair (max 1 retry)
      repairAttempts++;
      buildRepairPrompt(validation.error || "Unknown error", validation.fieldErrors);
      
      // Regenerate correctly
      rawPayload = this.generateSyntheticPayload(params.promptContract.id, params.context);
      validation = parseAndValidate<T>(rawPayload, params.promptContract.schema);

      if (!validation.success) {
        throw new SchemaValidationError(
          `Model output failed schema validation after repair attempt: ${validation.error}`,
          validation.fieldErrors
        );
      }
      wasRepaired = true;
    }

    const durationMs = Date.now() - startTime;
    const promptTokens = Math.max(50, Math.floor(params.promptContract.renderPrompt(params.context).length / 4));
    const completionTokens = Math.max(80, Math.floor(rawPayload.length / 4));

    return {
      data: validation.data!,
      rawText: rawPayload,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        estimatedCostMinorUnits: Math.ceil(((promptTokens * 0.15) + (completionTokens * 0.6)) / 100),
        durationMs,
      },
      provider: this.id,
      model: this.defaultModel,
      repaired: wasRepaired,
      repairAttemptCount: repairAttempts,
    };
  }

  private generateSyntheticPayload(contractId: string, context: any): string {
    const brief = context.brief || context;
    const businessName = brief?.businessName || "Acme Enterprises";
    const industry = brief?.industry || "Consulting";
    const city = brief?.location?.city || "Nairobi";
    const services = brief?.offerings || [
      { name: "Strategic Advisory", summary: "Expert guidance for growth." },
      { name: "Operational Delivery", summary: "Implementation and execution." },
    ];

    if (contractId.includes("site-plan")) {
      return JSON.stringify({
        themeId: brief?.preferredThemeId || "modern-slate",
        routes: ["/", "/about", "/services", "/blog", "/contact"],
        conversionGoal: brief?.conversionGoal || "enquiry",
        navigationCta: {
          label: brief?.conversionGoal === "quote" ? "Request Quote" : "Get in Touch",
          targetRoute: "/contact",
        },
      });
    }

    if (contractId.includes("hero")) {
      return JSON.stringify({
        headline: `Elevating ${businessName} in ${city}`,
        subhead: brief?.summary || `Delivering world-class ${industry.toLowerCase()} solutions tailored to your unique requirements.`,
        primaryCta: {
          label: "Explore Services",
          targetRoute: "/services",
        },
        secondaryCta: {
          label: "Contact Us",
          targetRoute: "/contact",
        },
      });
    }

    if (contractId.includes("services")) {
      return JSON.stringify({
        heading: `Professional ${industry} Solutions`,
        intro: `Explore our specialized service offerings designed to deliver measurable results and exceptional standards in ${city}.`,
        items: services.slice(0, 4).map((s: any) => ({
          title: s.name,
          description: s.summary || `Expert ${s.name.toLowerCase()} delivered with precision, reliability, and dedicated support.`,
          ctaLabel: "Learn More",
          targetRoute: "/services",
        })),
      });
    }

    if (contractId.includes("about")) {
      return JSON.stringify({
        heading: `About ${businessName}`,
        story: `${businessName} was established to bring high integrity, technical excellence, and reliable ${industry.toLowerCase()} capabilities to clients in ${city} and beyond.`,
        missionQuote: `To deliver sustainable value and remarkable service on every engagement.`,
        stats: [
          { value: "100%", label: "Client Dedication" },
          { value: "24/7", label: "Reliable Support" },
        ],
      });
    }

    if (contractId.includes("contact")) {
      return JSON.stringify({
        heading: "Start a Conversation",
        intro: `We welcome inquiries from prospective partners and clients in ${city} and across East Africa. Reach out today.`,
        email: brief?.contact?.email || "info@example.com",
        phone: brief?.contact?.phone || "+254 700 000 000",
        address: brief?.location?.address || `${city}, Kenya`,
        hours: brief?.contact?.hours || "Mon - Fri: 8:00 AM - 5:00 PM",
      });
    }

    if (contractId.includes("blog-index")) {
      return JSON.stringify({
        heading: `Insights & Industry Perspectives`,
        intro: `Thought leadership, updates, and practical guidance from the ${businessName} team.`,
      });
    }

    if (contractId.includes("blog-article")) {
      const topicIndex = context.topicIndex || 1;
      const topicTitles = [
        `Key Trends Shaping ${industry} in East Africa`,
        `How to Choose the Right ${industry} Partner for Your Growth`,
        `Best Practices for Operational Excellence in ${city}`,
      ];
      const title = topicTitles[topicIndex - 1] || `${industry} Perspectives`;
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      return JSON.stringify({
        title,
        slug,
        excerpt: `An insightful analysis of ${industry.toLowerCase()} considerations, strategies, and key market dynamics in ${city}.`,
        author: businessName,
        readTime: "4 min read",
        category: industry,
        tags: [industry.toLowerCase(), city.toLowerCase(), "strategy"],
        body: `## Introduction\n\nNavigating the ${industry.toLowerCase()} landscape requires strategic foresight and a commitment to quality standards. In this article, the ${businessName} team examines core lessons.\n\n### Strategic Priorities\n\n1. Rigorous planning and goal alignment.\n2. Sustainable execution with verified operational checks.\n3. Continuous measurement and client collaboration.\n\n### Conclusion\n\nSuccess in ${city} hinges on delivering proven results. Contact ${businessName} to learn more about our methodologies.`,
        status: "draft",
      });
    }

    // Generic fallback for any other schema
    return JSON.stringify({
      heading: `${businessName} Overview`,
      subhead: `Dedicated ${industry.toLowerCase()} solutions.`,
    });
  }
}
