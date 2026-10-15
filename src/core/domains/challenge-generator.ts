import { randomBytes } from "node:crypto";
import { DnsInstructionRecord } from "@/db/domain-repository";
import { DomainValidator } from "./domain-validator";

/**
 * Fortress AI — DNS Challenge Generator (TDD §22.4, §22.5, FR-061)
 */

export interface GeneratedChallenge {
  token: string;
  type: "txt" | "cname";
  challengeHost: string;
  challengeValue: string;
  expiresAt: string;
  instructions: DnsInstructionRecord[];
}

export class ChallengeGenerator {
  public static readonly CHALLENGE_TTL_HOURS = 72;
  public static readonly PLATFORM_CNAME_TARGET = "proxy.fortress.local";
  public static readonly PLATFORM_APEX_IP = "76.76.21.21";

  /**
   * Generate an anti-takeover ownership challenge for a custom hostname
   */
  public static generate(hostname: string, domainType: "custom_apex" | "custom_subdomain"): GeneratedChallenge {
    const cleanHost = DomainValidator.normalize(hostname);
    const parsed = DomainValidator.parse(cleanHost);

    // Cryptographic 32-byte hex token (CSPRNG)
    const token = randomBytes(32).toString("hex");
    const challengeHost = `_fortress-challenge.${cleanHost}`;
    const challengeValue = `fortress-verification=${token}`;

    const expiresAt = new Date(
      Date.now() + this.CHALLENGE_TTL_HOURS * 60 * 60 * 1000
    ).toISOString();

    const instructions: DnsInstructionRecord[] = [
      {
        type: "TXT",
        name: challengeHost,
        value: challengeValue,
        ttl: 300,
        purpose: "ownership_verification",
      },
    ];

    if (domainType === "custom_apex") {
      instructions.push({
        type: "A",
        name: "@",
        value: this.PLATFORM_APEX_IP,
        ttl: 300,
        purpose: "traffic_routing",
      });
      instructions.push({
        type: "CNAME",
        name: "www",
        value: this.PLATFORM_CNAME_TARGET,
        ttl: 300,
        purpose: "traffic_routing",
      });
    } else {
      // Subdomain (e.g. "safaris.example.com")
      const subName = parsed.subdomain || cleanHost.split(".")[0];
      instructions.push({
        type: "CNAME",
        name: subName,
        value: this.PLATFORM_CNAME_TARGET,
        ttl: 300,
        purpose: "traffic_routing",
      });
    }

    return {
      token,
      type: "txt",
      challengeHost,
      challengeValue,
      expiresAt,
      instructions,
    };
  }
}
