import { StoredDomainMapping, DnsInstructionRecord } from "@/db/domain-repository";

/**
 * Fortress AI — DNS Setup Guidance Engine (TDD §22.4, FR-064)
 */

export interface ProviderGuide {
  providerId: "generic" | "cloudflare" | "godaddy" | "namecheap" | "kenya_web_experts";
  providerName: string;
  steps: string[];
  tips?: string[];
}

export class DnsAdvisor {
  /**
   * Get formatted DNS records to configure for a domain mapping
   */
  public static getRecordsForDomain(mapping: StoredDomainMapping): DnsInstructionRecord[] {
    if (mapping.dnsInstructions && mapping.dnsInstructions.length > 0) {
      return mapping.dnsInstructions;
    }

    const host = mapping.hostname;
    const isApex = mapping.domainType === "custom_apex";

    const records: DnsInstructionRecord[] = [
      {
        type: "TXT",
        name: mapping.challengeHost || `_fortress-challenge.${host}`,
        value: mapping.challengeValue || `fortress-verification=${mapping.verificationToken}`,
        ttl: 300,
        purpose: "ownership_verification",
      },
    ];

    if (isApex) {
      records.push({
        type: "A",
        name: "@",
        value: "76.76.21.21",
        ttl: 300,
        purpose: "traffic_routing",
      });
      records.push({
        type: "CNAME",
        name: "www",
        value: "proxy.fortress.local",
        ttl: 300,
        purpose: "traffic_routing",
      });
    } else {
      const sub = host.split(".")[0];
      records.push({
        type: "CNAME",
        name: sub,
        value: "proxy.fortress.local",
        ttl: 300,
        purpose: "traffic_routing",
      });
    }

    return records;
  }

  /**
   * Get step-by-step setup guidance tailored to a DNS provider
   */
  public static getProviderGuide(providerId: string = "generic"): ProviderGuide {
    switch (providerId.toLowerCase()) {
      case "cloudflare":
        return {
          providerId: "cloudflare",
          providerName: "Cloudflare",
          steps: [
            "Log in to your Cloudflare Dashboard and select your domain zone.",
            "Navigate to DNS > Records.",
            "Click '+ Add record' to create the required TXT ownership verification record.",
            "Add the CNAME or A records for traffic routing. Ensure the Proxy status is set to 'DNS only' (grey cloud) during initial verification.",
            "Save records and allow 2-5 minutes for Edge propagation before verifying in Fortress.",
          ],
          tips: [
            "Setting proxy to 'DNS only' avoids SSL certificate challenge conflicts during initial setup.",
          ],
        };

      case "godaddy":
        return {
          providerId: "godaddy",
          providerName: "GoDaddy",
          steps: [
            "Sign in to your GoDaddy Domain Portfolio.",
            "Select your domain and click 'Manage DNS'.",
            "In the DNS Records table, click 'Add New Record'.",
            "Select TXT from the Type dropdown and enter the host and value provided by Fortress.",
            "Select CNAME or A and add the routing records.",
            "Set TTL to 1/2 hour or 600 seconds and click Save.",
          ],
        };

      case "namecheap":
        return {
          providerId: "namecheap",
          providerName: "Namecheap",
          steps: [
            "Log in to Namecheap and go to your Domain List.",
            "Click 'Manage' next to your domain, then open the 'Advanced DNS' tab.",
            "Click 'Add New Record'.",
            "Add the TXT record for verification and the A/CNAME records for traffic.",
            "Set TTL to Automatic or 1 min and click the green checkmark to save.",
          ],
        };

      case "kenya_web_experts":
        return {
          providerId: "kenya_web_experts",
          providerName: "Kenya Web Experts / Safaricom Domains",
          steps: [
            "Log in to your cPanel or Client Portal at your Kenyan registrar.",
            "Open 'Zone Editor' or 'DNS Management'.",
            "Click '+ TXT Record' next to your .co.ke domain and paste the challenge string.",
            "Add the CNAME record pointing to proxy.fortress.local.",
            "Save and allow 5-15 minutes for local KeNIC nameserver propagation.",
          ],
          tips: [
            "Kenyan .co.ke domains resolve rapidly across local Internet Exchange Points (KIXP).",
          ],
        };

      default:
        return {
          providerId: "generic",
          providerName: "Standard DNS Provider",
          steps: [
            "Log in to the account where your domain's nameservers are managed.",
            "Locate the DNS Management, Zone Editor, or DNS Records section.",
            "Add a TXT record with the Host and Value displayed in the verification table.",
            "Add the CNAME or A record for your website traffic.",
            "Save changes and click 'Verify DNS & SSL' in Fortress AI.",
          ],
        };
    }
  }
}
