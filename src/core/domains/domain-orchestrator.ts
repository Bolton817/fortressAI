import { domainRepository, StoredDomainMapping } from "@/db/domain-repository";
import { domainOrderRepository, StoredDomainOrder } from "@/db/domain-order-repository";
import { auditRepository } from "@/db/audit-repository";
import { notificationService } from "@/core/notifications/notification-service";
import { tenantRepository } from "@/db/tenant-repository";
import { DomainValidator } from "./domain-validator";
import { ChallengeGenerator } from "./challenge-generator";
import { DnsVerifier, DnsVerificationResult } from "./dns-verifier";
import { TlsChecker, TlsCheckResult } from "./tls-checker";
import { RegistrarService } from "./registrar-service";
import { RegistrantContact, RegistrationResult } from "./registrar-adapter";
import { ValidationError, TenantAccessDeniedError, ResourceNotFoundError } from "@/core/errors";

/**
 * Fortress AI — Domain Orchestration & Lifecycle Service (TDD §22, FR-060, FR-061, FR-063, FR-064)
 */

export class DomainOrchestrator {
  /**
   * Register a new domain with idempotency protection and attach to site
   */
  public static async registerAndAttachDomain(input: {
    siteId: string;
    userId: string;
    domain: string;
    termYears?: number;
    registrant: RegistrantContact;
    idempotencyKey: string;
    autoRenew?: boolean;
  }): Promise<{
    order: StoredDomainOrder;
    mapping: StoredDomainMapping;
    registration: RegistrationResult;
  }> {
    const site = tenantRepository.getSiteDirect(input.siteId);
    if (!site) {
      throw new ResourceNotFoundError("Site", input.siteId);
    }
    if (site.ownerUserId !== input.userId) {
      throw new TenantAccessDeniedError("Access denied to site resource.");
    }

    const domain = DomainValidator.normalize(input.domain);
    const syntax = DomainValidator.validate(domain);
    if (!syntax.isValid) {
      throw new ValidationError(syntax.error || "Invalid domain syntax.", [{ field: "domain", message: syntax.error || "Invalid domain syntax." }]);
    }

    const parsed = DomainValidator.parse(domain);

    // 1. Check idempotency in order repository
    const existingOrder = domainOrderRepository.getByIdempotencyKey(input.idempotencyKey);
    if (existingOrder && existingOrder.orderStatus === "completed") {
      const existingMapping = domainRepository.getDomain(domain);
      if (existingMapping) {
        return {
          order: existingOrder,
          mapping: existingMapping,
          registration: {
            success: true,
            domain,
            providerDomainId: existingOrder.providerOrderId || "dom_idempotent_cached",
            registeredAt: existingOrder.createdAt,
            expiresAt: existingOrder.expiresAt || "",
            termYears: existingOrder.termYears,
            nameservers: ["ns1.fortressdns.net", "ns2.fortressdns.net"],
            receiptId: existingOrder.receiptJson?.receiptId || "rcpt_idempotent",
            priceCents: existingOrder.priceCents,
            currency: existingOrder.currency,
          },
        };
      }
    }

    // 2. Execute registration call via RegistrarService
    const registration = await RegistrarService.register(
      {
        domain,
        termYears: input.termYears || 1,
        registrant: input.registrant,
      },
      input.idempotencyKey
    );

    // 3. Create persistent DomainOrder record
    const order = domainOrderRepository.createOrder({
      siteId: input.siteId,
      userId: input.userId,
      domainName: domain,
      tld: parsed.tld,
      termYears: registration.termYears,
      priceCents: registration.priceCents,
      currency: registration.currency,
      renewalPriceCents: registration.priceCents, // Standard renewal rate
      idempotencyKey: input.idempotencyKey,
      orderStatus: "completed",
      providerOrderId: registration.providerDomainId,
      registrant: input.registrant,
      autoRenew: input.autoRenew ?? true,
      expiresAt: registration.expiresAt,
      receiptJson: {
        receiptId: registration.receiptId,
        invoiceNumber: `INV-${Date.now().toString().slice(-8)}`,
        domainName: domain,
        termYears: registration.termYears,
        priceCents: registration.priceCents,
        currency: registration.currency,
        renewalPriceCents: registration.priceCents,
        paidAt: new Date().toISOString(),
        paymentMethod: "Account Balance / Direct Billing",
        registeredTo: `${input.registrant.firstName} ${input.registrant.lastName}`,
      },
    });

    // 4. Attach domain mapping to the site
    const domainType = parsed.isApex ? "custom_apex" : "custom_subdomain";
    domainRepository.createDomain(input.siteId, domain, domainType, false);

    // 5. Generate and assign challenge
    const challenge = ChallengeGenerator.generate(domain, domainType);
    domainRepository.setChallenge(domain, {
      type: challenge.type,
      host: challenge.challengeHost,
      value: challenge.challengeValue,
      expiresAt: challenge.expiresAt,
      instructions: challenge.instructions,
    });

    // 6. Generate and save initial EPP auth code
    try {
      const eppCode = await RegistrarService.getAuthCode(domain);
      domainRepository.setEppAuthCode(domain, eppCode);
    } catch {}

    // 7. Audit logging (TDD §22.5)
    auditRepository.recordEvent({
      action: "domain.register",
      actorUserId: input.userId,
      targetType: "domain",
      targetId: domain,
      metadata: {
        siteId: input.siteId,
        orderId: order.id,
        receiptId: registration.receiptId,
        providerDomainId: registration.providerDomainId,
        isAssisted: Boolean(registration.isAssistedRegistration),
      },
    });

    // 8. Tenant In-App notification
    notificationService.notifyDomainRegistered({
      userId: input.userId,
      siteId: input.siteId,
      domain,
      receiptId: registration.receiptId,
    });

    return {
      order,
      mapping: domainRepository.getDomain(domain)!,
      registration,
    };
  }

  /**
   * Attach an existing custom domain to a site and issue ownership challenge
   */
  public static attachCustomDomain(input: {
    siteId: string;
    userId: string;
    rawHostname: string;
    isPrimary?: boolean;
  }): StoredDomainMapping {
    const site = tenantRepository.getSiteDirect(input.siteId);
    if (!site) {
      throw new ResourceNotFoundError("Site", input.siteId);
    }
    if (site.ownerUserId !== input.userId) {
      throw new TenantAccessDeniedError("Access denied to site resource.");
    }

    const domain = DomainValidator.normalize(input.rawHostname);
    const syntax = DomainValidator.validate(domain);
    if (!syntax.isValid) {
      throw new ValidationError(syntax.error || "Invalid hostname syntax.", [{ field: "hostname", message: syntax.error || "Invalid hostname syntax." }]);
    }

    // Anti-Takeover guard: verify domain is not mapped to another site
    const existing = domainRepository.getDomain(domain);
    if (existing && existing.siteId !== input.siteId) {
      throw new ValidationError(
        `Hostname "${domain}" is already claimed or mapped to another site.`,
        [{ field: "hostname", message: `Hostname "${domain}" is already claimed or mapped to another site.` }]
      );
    }

    const parsed = DomainValidator.parse(domain);
    const domainType = parsed.isApex ? "custom_apex" : "custom_subdomain";

    domainRepository.createDomain(
      input.siteId,
      domain,
      domainType,
      input.isPrimary ?? false
    );

    const challenge = ChallengeGenerator.generate(domain, domainType);
    domainRepository.setChallenge(domain, {
      type: challenge.type,
      host: challenge.challengeHost,
      value: challenge.challengeValue,
      expiresAt: challenge.expiresAt,
      instructions: challenge.instructions,
    });

    auditRepository.recordEvent({
      action: "domain.attach",
      actorUserId: input.userId,
      targetType: "domain",
      targetId: domain,
      metadata: {
        siteId: input.siteId,
        domainType,
      },
    });

    return domainRepository.getDomain(domain)!;
  }

  /**
   * Trigger DNS & TLS verification check for a custom domain
   */
  public static async verifyCustomDomain(input: {
    siteId: string;
    userId: string;
    rawHostname: string;
  }): Promise<{
    dnsResult: DnsVerificationResult;
    tlsResult: TlsCheckResult;
    mapping: StoredDomainMapping;
  }> {
    const site = tenantRepository.getSiteDirect(input.siteId);
    if (!site) {
      throw new ResourceNotFoundError("Site", input.siteId);
    }
    if (site.ownerUserId !== input.userId) {
      throw new TenantAccessDeniedError("Access denied to site resource.");
    }

    const domain = DomainValidator.normalize(input.rawHostname);
    const mapping = domainRepository.getDomain(domain);
    if (!mapping || mapping.siteId !== input.siteId) {
      throw new ResourceNotFoundError("DomainMapping", domain);
    }

    // 1. Run DNS verification
    const dnsResult = await DnsVerifier.verify(domain);

    // 2. If DNS is verified, run TLS check
    let tlsResult: TlsCheckResult;
    if (dnsResult.success) {
      tlsResult = await TlsChecker.check(domain);
    } else {
      tlsResult = {
        success: false,
        hostname: domain,
        status: "pending",
        reason: "DNS verification must pass before SSL certificate provisioning can begin.",
        lastCheckedAt: new Date().toISOString(),
      };
    }

    auditRepository.recordEvent({
      action: "domain.verify",
      actorUserId: input.userId,
      targetType: "domain",
      targetId: domain,
      metadata: {
        siteId: input.siteId,
        dnsStatus: dnsResult.status,
        tlsStatus: tlsResult.status,
      },
    });

    return {
      dnsResult,
      tlsResult,
      mapping: domainRepository.getDomain(domain)!,
    };
  }

  /**
   * Detach a custom domain mapping from a site
   */
  public static detachCustomDomain(input: {
    siteId: string;
    userId: string;
    rawHostname: string;
  }): void {
    const site = tenantRepository.getSiteDirect(input.siteId);
    if (!site) {
      throw new ResourceNotFoundError("Site", input.siteId);
    }
    if (site.ownerUserId !== input.userId) {
      throw new TenantAccessDeniedError("Access denied to site resource.");
    }

    const domain = DomainValidator.normalize(input.rawHostname);
    const mapping = domainRepository.getDomain(domain);
    if (!mapping || mapping.siteId !== input.siteId) {
      throw new ResourceNotFoundError("DomainMapping", domain);
    }

    if (mapping.domainType === "platform_subdomain") {
      throw new ValidationError("Platform subdomains cannot be detached.");
    }

    domainRepository.deleteDomain(domain);

    auditRepository.recordEvent({
      action: "domain.detach",
      actorUserId: input.userId,
      targetType: "domain",
      targetId: domain,
      metadata: {
        siteId: input.siteId,
      },
    });
  }
}
