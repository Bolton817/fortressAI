/**
 * Fortress AI — Plan Catalog & Price Book (TDD §8, §24.1, FR-069)
 * Authoritative specification of tiers, resource quotas, and multi-currency pricing.
 * Invariant: Financial amounts are non-negative integer minor units (cents).
 */

export type PlanTierId = "free" | "starter" | "pro" | "business";

export interface PlanEntitlements {
  maxSites: number;
  maxPagesPerSite: number;
  monthlyAiCredits: number;
  monthlyBlogArticles: number;
  maxCustomDomains: number;
  exportAllowed: boolean;
  supportTier: "community" | "standard" | "priority" | "dedicated";
  customBrandingAllowed: boolean;
}

export interface PlanPricing {
  currency: string;
  monthlyMinorUnits: number; // e.g. 1900 = $19.00
  annualMinorUnits: number;  // e.g. 19000 = $190.00 (2 months free!)
}

export interface PlanDefinition {
  id: PlanTierId;
  name: string;
  tagline: string;
  badge?: string;
  entitlements: PlanEntitlements;
  pricing: Record<string, PlanPricing>; // "USD" | "KES"
  featuresList: string[];
}

export const PLAN_CATALOG: Record<PlanTierId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free Trial",
    tagline: "Explore the platform and preview AI website generation",
    entitlements: {
      maxSites: 1,
      maxPagesPerSite: 3,
      monthlyAiCredits: 15,
      monthlyBlogArticles: 0,
      maxCustomDomains: 0,
      exportAllowed: false,
      supportTier: "community",
      customBrandingAllowed: false,
    },
    pricing: {
      USD: { currency: "USD", monthlyMinorUnits: 0, annualMinorUnits: 0 },
      KES: { currency: "KES", monthlyMinorUnits: 0, annualMinorUnits: 0 },
    },
    featuresList: [
      "1 Website",
      "Up to 3 pages",
      "15 AI Generation Credits",
      "Fortress AI Subdomain",
      "Community Support",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "Ideal for small businesses launching their first professional website",
    entitlements: {
      maxSites: 3,
      maxPagesPerSite: 10,
      monthlyAiCredits: 100,
      monthlyBlogArticles: 5,
      maxCustomDomains: 1,
      exportAllowed: true,
      supportTier: "standard",
      customBrandingAllowed: true,
    },
    pricing: {
      USD: { currency: "USD", monthlyMinorUnits: 1900, annualMinorUnits: 19000 },
      KES: { currency: "KES", monthlyMinorUnits: 250000, annualMinorUnits: 2500000 },
    },
    featuresList: [
      "3 Websites",
      "Up to 10 pages per site",
      "100 AI Generation Credits / month",
      "5 Blog Articles / month",
      "1 Custom Domain connection",
      "Clean Static HTML/CSS Export",
      "Standard Email Support",
    ],
  },
  pro: {
    id: "pro",
    name: "Professional",
    tagline: "For growing companies requiring multipage sites, blog pipelines, and domains",
    badge: "Most Popular",
    entitlements: {
      maxSites: 10,
      maxPagesPerSite: 30,
      monthlyAiCredits: 500,
      monthlyBlogArticles: 25,
      maxCustomDomains: 5,
      exportAllowed: true,
      supportTier: "priority",
      customBrandingAllowed: true,
    },
    pricing: {
      USD: { currency: "USD", monthlyMinorUnits: 4900, annualMinorUnits: 49000 },
      KES: { currency: "KES", monthlyMinorUnits: 650000, annualMinorUnits: 6500000 },
    },
    featuresList: [
      "10 Websites",
      "Up to 30 pages per site",
      "500 AI Generation Credits / month",
      "25 Blog Articles / month",
      "5 Custom Domains",
      "Fast Edge CDN Deployment",
      "Full Code & Asset Export",
      "Priority Support (24h SLA)",
    ],
  },
  business: {
    id: "business",
    name: "Business / Scale",
    tagline: "For agencies and large organisations managing multiple portfolios",
    entitlements: {
      maxSites: 50,
      maxPagesPerSite: 100,
      monthlyAiCredits: 2500,
      monthlyBlogArticles: 100,
      maxCustomDomains: 25,
      exportAllowed: true,
      supportTier: "dedicated",
      customBrandingAllowed: true,
    },
    pricing: {
      USD: { currency: "USD", monthlyMinorUnits: 12900, annualMinorUnits: 129000 },
      KES: { currency: "KES", monthlyMinorUnits: 1700000, annualMinorUnits: 17000000 },
    },
    featuresList: [
      "50 Websites",
      "Up to 100 pages per site",
      "2,500 AI Generation Credits / month",
      "100 Blog Articles / month",
      "25 Custom Domains",
      "Unlimited Static Exports",
      "Dedicated Slack / Phone Support",
    ],
  },
};

export class PlanCatalog {
  static getPlan(planId: string): PlanDefinition {
    const plan = PLAN_CATALOG[planId as PlanTierId];
    if (!plan) {
      // Safe fallback to Free tier
      return PLAN_CATALOG.free;
    }
    return plan;
  }

  static getAllPlans(): PlanDefinition[] {
    return Object.values(PLAN_CATALOG);
  }

  static calculatePrice(
    planId: string,
    interval: "monthly" | "annual",
    currency: "USD" | "KES" = "USD"
  ): { amountMinorUnits: number; currency: string } {
    const plan = this.getPlan(planId);
    const currKey = currency.toUpperCase() === "KES" ? "KES" : "USD";
    const pricing = plan.pricing[currKey] || plan.pricing.USD;

    const amountMinorUnits =
      interval === "annual"
        ? pricing.annualMinorUnits
        : pricing.monthlyMinorUnits;

    return {
      amountMinorUnits,
      currency: currKey,
    };
  }
}
