import { domainRepository } from "@/db/domain-repository";
import { auditRepository } from "@/db/audit-repository";
import { notificationService } from "@/core/notifications/notification-service";
import { tenantRepository } from "@/db/tenant-repository";
import { RegistrarService } from "./registrar-service";
import { DomainValidator } from "./domain-validator";
import { TransferResult } from "./registrar-adapter";
import { TenantAccessDeniedError, ResourceNotFoundError, ValidationError } from "@/core/errors";

/**
 * Fortress AI — Domain Portability & Transfer Engine (TDD §22.3, FR-066)
 * Zero dark patterns: Customers retain full rights to unlock and transfer domains away.
 */

export interface TransferDetails {
  domain: string;
  isLocked: boolean;
  authCode: string;
  registrantEmail?: string;
  instructions: string[];
  policyNotes: string;
}

export class TransferService {
  /**
   * Get transfer authorization details and step-by-step instructions
   */
  public static async getTransferDetails(
    siteId: string,
    userId: string,
    rawDomain: string
  ): Promise<TransferDetails> {
    const site = tenantRepository.getSiteDirect(siteId);
    if (!site) {
      throw new ResourceNotFoundError("Site", siteId);
    }
    if (site.ownerUserId !== userId) {
      throw new TenantAccessDeniedError("Access denied to site resource.");
    }

    const domain = DomainValidator.normalize(rawDomain);
    const mapping = domainRepository.getDomain(domain);
    if (!mapping || mapping.siteId !== siteId) {
      throw new ResourceNotFoundError("DomainMapping", domain);
    }

    if (mapping.domainType === "platform_subdomain") {
      throw new ValidationError("Platform subdomains (*.fortress.local) cannot be transferred out.");
    }

    // Retrieve EPP authorization code from registrar
    let authCode = mapping.eppAuthCode;
    if (!authCode) {
      try {
        authCode = await RegistrarService.getAuthCode(domain);
        domainRepository.setEppAuthCode(domain, authCode);
      } catch {
        authCode = "EPP-AuthCodePending!";
      }
    }

    return {
      domain,
      isLocked: mapping.isLocked,
      authCode,
      instructions: [
        "Ensure your domain transfer lock is toggled to UNLOCKED.",
        "Copy your EPP Authorization Code provided below.",
        "Go to your new registrar (e.g. Cloudflare, Namecheap, Safaricom) and submit a Domain Transfer request.",
        "When prompted by the new registrar, paste your EPP Authorization Code.",
        "Approve the Standard Transfer Authorization email sent to your registrant contact address.",
        "Domain transfer will complete within 5-7 business days per ICANN / KeNIC guidelines.",
      ],
      policyNotes: "Transferring your domain away does NOT delete your website, published releases, or exported site packages in Fortress AI.",
    };
  }

  /**
   * Toggle domain transfer lock status
   */
  public static async setLockStatus(
    siteId: string,
    userId: string,
    rawDomain: string,
    isLocked: boolean
  ): Promise<boolean> {
    const site = tenantRepository.getSiteDirect(siteId);
    if (!site) {
      throw new ResourceNotFoundError("Site", siteId);
    }
    if (site.ownerUserId !== userId) {
      throw new TenantAccessDeniedError("Access denied to site resource.");
    }

    const domain = DomainValidator.normalize(rawDomain);
    const mapping = domainRepository.getDomain(domain);
    if (!mapping || mapping.siteId !== siteId) {
      throw new ResourceNotFoundError("DomainMapping", domain);
    }

    // Call registrar adapter
    await RegistrarService.setLock(domain, isLocked);

    // Update repository
    domainRepository.setLockStatus(domain, isLocked);

    auditRepository.recordEvent({
      action: isLocked ? "domain.lock" : "domain.unlock",
      actorUserId: userId,
      targetType: "domain",
      targetId: domain,
      metadata: {
        siteId,
        isLocked,
      },
    });

    return isLocked;
  }

  /**
   * Initiate formal domain transfer out
   */
  public static async requestTransferOut(
    siteId: string,
    userId: string,
    rawDomain: string,
    authCode?: string
  ): Promise<TransferResult> {
    const site = tenantRepository.getSiteDirect(siteId);
    if (!site) {
      throw new ResourceNotFoundError("Site", siteId);
    }
    if (site.ownerUserId !== userId) {
      throw new TenantAccessDeniedError("Access denied to site resource.");
    }

    const domain = DomainValidator.normalize(rawDomain);
    const mapping = domainRepository.getDomain(domain);
    if (!mapping || mapping.siteId !== siteId) {
      throw new ResourceNotFoundError("DomainMapping", domain);
    }

    const result = await RegistrarService.transferOut(domain, authCode);

    if (result.success) {
      auditRepository.recordEvent({
        action: "domain.transfer_requested",
        actorUserId: userId,
        targetType: "domain",
        targetId: domain,
        metadata: {
          siteId,
          transferStatus: result.status,
        },
      });

      notificationService.notifyDomainTransferred({
        userId,
        siteId,
        domain,
      });
    }

    return result;
  }
}
