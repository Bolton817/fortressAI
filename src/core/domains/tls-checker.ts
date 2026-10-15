import * as tls from "node:tls";
import { domainRepository } from "@/db/domain-repository";
import { DomainValidator } from "./domain-validator";

/**
 * Fortress AI — TLS Readiness & Certificate Validator (TDD §22.4, FR-064)
 */

export interface TlsCheckResult {
  success: boolean;
  hostname: string;
  status: "active" | "pending" | "error";
  issuer?: string;
  validFrom?: string;
  validTo?: string;
  daysRemaining?: number;
  reason?: string;
  lastCheckedAt: string;
}

export class TlsChecker {
  private static mockTlsOverrides: Map<string, { status: "active" | "pending" | "error"; issuer?: string }> = new Map();

  /**
   * Set simulated TLS readiness for automated tests
   */
  public static setMockTls(hostname: string, status: "active" | "pending" | "error", issuer?: string): void {
    this.mockTlsOverrides.set(hostname.toLowerCase().trim(), { status, issuer });
  }

  /**
   * Clear mock TLS overrides
   */
  public static clearMockTls(): void {
    this.mockTlsOverrides.clear();
  }

  /**
   * Check TLS readiness and SSL certificate status for a hostname
   */
  public static async check(rawHostname: string): Promise<TlsCheckResult> {
    const hostname = DomainValidator.normalize(rawHostname);
    const mapping = domainRepository.getDomain(hostname);
    const now = new Date().toISOString();

    if (!mapping) {
      return {
        success: false,
        hostname,
        status: "error",
        reason: `Domain mapping for "${hostname}" does not exist.`,
        lastCheckedAt: now,
      };
    }

    // Platform subdomains have built-in wildcard TLS on *.localhost or *.fortress.local
    if (mapping.domainType === "platform_subdomain") {
      domainRepository.updateTlsStatus(hostname, "active", now);
      return {
        success: true,
        hostname,
        status: "active",
        issuer: "Fortress Platform Edge CA",
        validFrom: mapping.createdAt,
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        daysRemaining: 365,
        lastCheckedAt: now,
      };
    }

    // Invariant: DNS verification must succeed before TLS certificate is active (TDD §22.4, FR-064)
    if (mapping.verificationStatus !== "verified") {
      domainRepository.updateTlsStatus(hostname, "pending", now);
      return {
        success: false,
        hostname,
        status: "pending",
        reason: "DNS verification must pass before SSL certificate provisioning can complete.",
        lastCheckedAt: now,
      };
    }

    // 1. Check mock override first (for unit/integration testing)
    if (this.mockTlsOverrides.has(hostname)) {
      const override = this.mockTlsOverrides.get(hostname)!;
      domainRepository.updateTlsStatus(hostname, override.status, now);
      return {
        success: override.status === "active",
        hostname,
        status: override.status,
        issuer: override.issuer || "Let's Encrypt Authority X3",
        validFrom: now,
        validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        daysRemaining: 90,
        lastCheckedAt: now,
      };
    }

    // 2. In local development or testing without live public webhooks:
    // When DNS is verified, simulate standard Edge CDN certificate issuance
    if (process.env.NODE_ENV !== "production" || hostname.endsWith(".local") || hostname.endsWith(".localhost")) {
      domainRepository.updateTlsStatus(hostname, "active", now);
      return {
        success: true,
        hostname,
        status: "active",
        issuer: "Fortress Edge Managed CA",
        validFrom: now,
        validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        daysRemaining: 90,
        lastCheckedAt: now,
      };
    }

    // 3. In live production: perform SNI connection check
    return new Promise((resolve) => {
      const socket = tls.connect(
        {
          host: hostname,
          port: 443,
          servername: hostname,
          timeout: 4000,
        },
        () => {
          const cert = socket.getPeerCertificate();
          socket.end();

          if (!cert || !cert.valid_to) {
            domainRepository.updateTlsStatus(hostname, "pending", now);
            resolve({
              success: false,
              hostname,
              status: "pending",
              reason: "TLS handshake succeeded but certificate details could not be parsed.",
              lastCheckedAt: now,
            });
            return;
          }

          const validTo = new Date(cert.valid_to);
          const daysRemaining = Math.max(
            0,
            Math.floor((validTo.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
          );

          domainRepository.updateTlsStatus(hostname, "active", now);
          const issuerOrg = Array.isArray(cert.issuer?.O)
            ? cert.issuer.O.join(", ")
            : cert.issuer?.O;

          resolve({
            success: true,
            hostname,
            status: "active",
            issuer: issuerOrg || "Automated Edge CA",
            validFrom: cert.valid_from,
            validTo: cert.valid_to,
            daysRemaining,
            lastCheckedAt: now,
          });
        }
      );

      socket.on("error", (err) => {
        domainRepository.updateTlsStatus(hostname, "pending", now);
        resolve({
          success: false,
          hostname,
          status: "pending",
          reason: `TLS connection failed or certificate pending: ${err.message}`,
          lastCheckedAt: now,
        });
      });

      socket.on("timeout", () => {
        socket.destroy();
        domainRepository.updateTlsStatus(hostname, "pending", now);
        resolve({
          success: false,
          hostname,
          status: "pending",
          reason: "TLS connection timed out.",
          lastCheckedAt: now,
        });
      });
    });
  }
}
