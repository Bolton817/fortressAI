import { auditRepository, AuditEventRecord, AuditTargetType } from "@/db/audit-repository";

/**
 * Fortress AI — Audit Service & Action Reconstructor (TDD §32.3, FR-086)
 * High-level orchestration for security, billing, domain, and publish audit logging.
 */

export class AuditService {
  /**
   * Record site release publication
   */
  public logPublish(
    siteId: string,
    userId: string,
    releaseId: string,
    releaseNumber: number
  ): AuditEventRecord {
    return auditRepository.record({
      actorUserId: userId,
      action: "site.published",
      targetType: "site",
      targetId: siteId,
      metadata: { releaseId, releaseNumber },
    });
  }

  /**
   * Record site rollback
   */
  public logRollback(
    siteId: string,
    userId: string,
    fromReleaseId: string,
    toReleaseId: string,
    reason: string
  ): AuditEventRecord {
    return auditRepository.record({
      actorUserId: userId,
      action: "site.rollback",
      targetType: "site",
      targetId: siteId,
      reason,
      metadata: { fromReleaseId, toReleaseId },
    });
  }

  /**
   * Record domain registration
   */
  public logDomainRegister(
    domainName: string,
    userId: string,
    siteId: string,
    orderId: string
  ): AuditEventRecord {
    return auditRepository.record({
      actorUserId: userId,
      action: "domain.registered",
      targetType: "domain",
      targetId: domainName,
      metadata: { siteId, orderId },
    });
  }

  /**
   * Record domain lock toggle or transfer request
   */
  public logDomainTransfer(
    domainName: string,
    userId: string,
    action: "lock_toggled" | "auth_code_generated" | "transfer_requested"
  ): AuditEventRecord {
    return auditRepository.record({
      actorUserId: userId,
      action: `domain.${action}`,
      targetType: "domain",
      targetId: domainName,
    });
  }

  /**
   * Record billing refund or credit adjustment
   */
  public logRefund(
    invoiceId: string,
    userId: string,
    amountMinorUnits: number,
    currency: string,
    reason: string
  ): AuditEventRecord {
    return auditRepository.record({
      actorUserId: userId,
      action: "billing.refund_issued",
      targetType: "billing",
      targetId: invoiceId,
      reason,
      metadata: { amountMinorUnits, currency },
    });
  }

  /**
   * Record administrative mutation with mandatory reason capture (FR-087)
   */
  public logAdminAction(
    adminUserId: string,
    action: string,
    targetType: AuditTargetType,
    targetId: string,
    reason: string,
    metadata?: Record<string, any>
  ): AuditEventRecord {
    if (!reason || reason.trim().length === 0) {
      throw new Error("Admin mutations require a mandatory reason field (FR-087, TDD §32.4)");
    }
    return auditRepository.record({
      actorUserId: adminUserId,
      action: `admin.${action}`,
      targetType,
      targetId,
      reason,
      metadata,
    });
  }

  /**
   * Reconstruct full chronological lifecycle for any resource
   */
  public reconstructLifecycle(targetId: string): AuditEventRecord[] {
    return auditRepository.reconstructHistory(targetId);
  }
}

export const auditService = new AuditService();
