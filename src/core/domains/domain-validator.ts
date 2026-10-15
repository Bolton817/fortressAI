/**
 * Fortress AI — Domain Syntax & Hostname Validator (RFC 1035, TDD §7.1, §22.3, FR-060, FR-062)
 */

export interface ParsedDomain {
  domain: string;
  sld: string; // second-level domain or name part (e.g. "acme" in "acme.co.ke")
  tld: string; // top-level domain (e.g. "co.ke" or "com")
  subdomain?: string;
  isApex: boolean;
}

export class DomainValidator {
  private static RESERVED_HOSTNAMES = new Set([
    "localhost",
    "127.0.0.1",
    "::1",
    "admin",
    "api",
    "auth",
    "dashboard",
    "preview",
    "proxy",
    "site",
    "www",
    "mail",
    "ftp",
    "smtp",
    "pop",
    "imap",
    "ns1",
    "ns2",
    "dns",
    "fortress",
    "fortressai",
  ]);

  // Known two-part TLDs
  private static TWO_PART_TLDS = new Set([
    "co.ke",
    "or.ke",
    "ac.ke",
    "sc.ke",
    "me.ke",
    "ne.ke",
    "go.ke",
    "co.uk",
    "org.uk",
    "com.au",
    "net.au",
    "co.za",
    "com.ng",
  ]);

  /**
   * Clean and normalize a raw domain or URL string
   */
  public static normalize(raw: string): string {
    return raw
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/^\.+|\.+$/g, "")
      .split(":")[0];
  }

  /**
   * Validate domain syntax according to RFC 1035 rules
   */
  public static validate(raw: string): { isValid: boolean; error?: string } {
    const domain = this.normalize(raw);

    if (!domain) {
      return { isValid: false, error: "Domain name cannot be empty." };
    }

    if (domain.length > 253) {
      return { isValid: false, error: "Domain name exceeds maximum length of 253 characters." };
    }

    if (this.RESERVED_HOSTNAMES.has(domain)) {
      return { isValid: false, error: `Domain name "${domain}" is reserved by the platform.` };
    }

    const labels = domain.split(".");
    if (labels.length < 2) {
      return { isValid: false, error: "Domain name must contain at least a name and a valid extension (TLD)." };
    }

    for (const label of labels) {
      if (label.length === 0) {
        return { isValid: false, error: "Domain contains consecutive or trailing dots." };
      }
      if (label.length > 63) {
        return { isValid: false, error: `Domain label "${label}" exceeds maximum length of 63 characters.` };
      }
      if (label.startsWith("-") || label.endsWith("-")) {
        return { isValid: false, error: `Domain label "${label}" cannot start or end with a hyphen.` };
      }
      if (!/^[a-z0-9-]+$/.test(label)) {
        return { isValid: false, error: `Domain label "${label}" contains invalid characters. Only letters, numbers, and hyphens are permitted.` };
      }
    }

    return { isValid: true };
  }

  /**
   * Parse a valid domain into SLD, TLD, and Subdomain parts
   */
  public static parse(raw: string): ParsedDomain {
    const domain = this.normalize(raw);
    const labels = domain.split(".");

    if (labels.length < 2) {
      throw new Error(`Cannot parse invalid domain "${raw}".`);
    }

    // Check if the last two labels form a known compound TLD (e.g. "co.ke")
    if (labels.length >= 3) {
      const candidateCompoundTld = `${labels[labels.length - 2]}.${labels[labels.length - 1]}`;
      if (this.TWO_PART_TLDS.has(candidateCompoundTld)) {
        const tld = candidateCompoundTld;
        const sld = labels[labels.length - 3];
        const subLabels = labels.slice(0, labels.length - 3);
        const subdomain = subLabels.length > 0 ? subLabels.join(".") : undefined;

        return {
          domain,
          sld,
          tld,
          subdomain,
          isApex: !subdomain,
        };
      }
    }

    // Standard 1-part TLD (e.g. "com", "ke", "org")
    const tld = labels[labels.length - 1];
    const sld = labels[labels.length - 2];
    const subLabels = labels.slice(0, labels.length - 2);
    const subdomain = subLabels.length > 0 ? subLabels.join(".") : undefined;

    return {
      domain,
      sld,
      tld,
      subdomain,
      isApex: !subdomain,
    };
  }
}
