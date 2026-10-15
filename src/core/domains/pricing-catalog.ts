/**
 * Fortress AI — Domain Pricing Book & Supported TLD Catalog (TDD §22.3, §24, FR-062)
 */

export interface TldPricing {
  tld: string;
  firstTermPriceCents: number;
  renewalPriceCents: number;
  currency: string;
  minYears: number;
  maxYears: number;
  description: string;
  requiresContactVerification?: boolean;
  specialPolicy?: string;
}

export class PricingCatalog {
  private static catalog: Record<string, TldPricing> = {
    "com": {
      tld: "com",
      firstTermPriceCents: 1499, // $14.99
      renewalPriceCents: 1499,
      currency: "USD",
      minYears: 1,
      maxYears: 10,
      description: "Commercial & Global Standard",
    },
    "co.ke": {
      tld: "co.ke",
      firstTermPriceCents: 1299, // $12.99 (approx KES 1,800)
      renewalPriceCents: 1299,
      currency: "USD",
      minYears: 1,
      maxYears: 5,
      description: "Kenya Commercial Business",
      requiresContactVerification: true,
      specialPolicy: "Accredited under KeNIC (Kenya Network Information Centre) guidelines.",
    },
    "ke": {
      tld: "ke",
      firstTermPriceCents: 3500, // $35.00
      renewalPriceCents: 3500,
      currency: "USD",
      minYears: 1,
      maxYears: 5,
      description: "Kenya National Second-Level Domain",
      requiresContactVerification: true,
      specialPolicy: "National second-level TLD overseen by KeNIC.",
    },
    "org": {
      tld: "org",
      firstTermPriceCents: 1599, // $15.99
      renewalPriceCents: 1599,
      currency: "USD",
      minYears: 1,
      maxYears: 10,
      description: "Organizations, Foundations & Non-profits",
    },
    "net": {
      tld: "net",
      firstTermPriceCents: 1699, // $16.99
      renewalPriceCents: 1699,
      currency: "USD",
      minYears: 1,
      maxYears: 10,
      description: "Network Infrastructure & Technology",
    },
    "io": {
      tld: "io",
      firstTermPriceCents: 3999, // $39.99
      renewalPriceCents: 3999,
      currency: "USD",
      minYears: 1,
      maxYears: 5,
      description: "Tech Startups & Developer Platforms",
    },
    "africa": {
      tld: "africa",
      firstTermPriceCents: 1899, // $18.99
      renewalPriceCents: 1899,
      currency: "USD",
      minYears: 1,
      maxYears: 10,
      description: "Pan-African Businesses & Cultural Initiatives",
    },
    "store": {
      tld: "store",
      firstTermPriceCents: 999, // $9.99
      renewalPriceCents: 2999,
      currency: "USD",
      minYears: 1,
      maxYears: 10,
      description: "E-Commerce & Retail Stores",
    },
    "biz": {
      tld: "biz",
      firstTermPriceCents: 1799, // $17.99
      renewalPriceCents: 1799,
      currency: "USD",
      minYears: 1,
      maxYears: 10,
      description: "Small Business & Professional Services",
    },
  };

  /**
   * Normalize TLD string (e.g. ".CO.KE" -> "co.ke")
   */
  public static normalizeTld(rawTld: string): string {
    return rawTld.toLowerCase().trim().replace(/^\.+/, "");
  }

  /**
   * Check if a given TLD is supported in the catalog
   */
  public static isSupported(rawTld: string): boolean {
    const tld = this.normalizeTld(rawTld);
    return Boolean(this.catalog[tld]);
  }

  /**
   * Get pricing details for a given TLD
   */
  public static getPricing(rawTld: string): TldPricing | null {
    const tld = this.normalizeTld(rawTld);
    return this.catalog[tld] ? { ...this.catalog[tld] } : null;
  }

  /**
   * List all supported TLDs and their standard pricing
   */
  public static listSupported(): TldPricing[] {
    return Object.values(this.catalog).map((item) => ({ ...item }));
  }
}
