import { domainOrderRepository, StoredDomainOrder } from "@/db/domain-order-repository";
import { notificationService } from "@/core/notifications/notification-service";
import { auditRepository } from "@/db/audit-repository";
import { RegistrarService } from "./registrar-service";
import { RenewalResult } from "./registrar-adapter";

/**
 * Fortress AI — Domain Renewal Scheduler & Alert Engine (TDD §22.1, FR-065)
 */

export interface RenewalEvaluationResult {
  domain: string;
  expiresAt: string;
  daysRemaining: number;
  reminderDispatched: boolean;
  milestone?: number; // 30, 14, 7, 1
}

export class RenewalService {
  public static readonly REMINDER_MILESTONES = [30, 14, 7, 1];

  /**
   * Evaluate all registered domains and dispatch renewal reminders where due
   */
  public static async evaluateAndDispatchReminders(): Promise<RenewalEvaluationResult[]> {
    const results: RenewalEvaluationResult[] = [];
    const allOrders = domainOrderRepository.listAllOrders();

    for (const order of allOrders) {
      if (order.orderStatus === "completed" && order.expiresAt) {
        const evalResult = this.evaluateOrder(order);
        results.push(evalResult);
      }
    }

    return results;
  }

  /**
   * Evaluate a specific domain order for renewal milestones
   */
  public static evaluateOrder(order: StoredDomainOrder, referenceTime: Date = new Date()): RenewalEvaluationResult {
    if (!order.expiresAt) {
      return {
        domain: order.domainName,
        expiresAt: "",
        daysRemaining: 999,
        reminderDispatched: false,
      };
    }

    const expiryTime = new Date(order.expiresAt).getTime();
    const msRemaining = expiryTime - referenceTime.getTime();
    const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));

    let milestoneToTrigger: number | undefined;

    const ascendingMilestones = [...this.REMINDER_MILESTONES].sort((a, b) => a - b);
    for (const milestone of ascendingMilestones) {
      // If daysRemaining is at or below milestone and greater than 0
      if (daysRemaining <= milestone && daysRemaining > 0) {
        milestoneToTrigger = milestone;
        break;
      }
    }

    let reminderDispatched = false;
    if (milestoneToTrigger !== undefined) {
      notificationService.notifyDomainRenewalDue({
        userId: order.userId,
        siteId: order.siteId,
        domain: order.domainName,
        daysRemaining,
        expiresAt: order.expiresAt,
      });

      auditRepository.recordEvent({
        action: "domain.renewal_reminder",
        actorUserId: order.userId,
        targetType: "domain",
        targetId: order.domainName,
        metadata: {
          daysRemaining,
          milestone: milestoneToTrigger,
          expiresAt: order.expiresAt,
        },
      });

      reminderDispatched = true;
    }

    return {
      domain: order.domainName,
      expiresAt: order.expiresAt,
      daysRemaining,
      reminderDispatched,
      milestone: milestoneToTrigger,
    };
  }

  /**
   * Execute manual or automated renewal of an existing domain
   */
  public static async executeRenewal(
    orderId: string,
    termYears: number = 1,
    idempotencyKey: string
  ): Promise<RenewalResult> {
    const order = domainOrderRepository.getOrderById(orderId);
    if (!order) {
      throw new Error(`Domain order with ID "${orderId}" not found.`);
    }

    const result = await RegistrarService.renew(order.domainName, termYears, idempotencyKey);

    // Update order with new expiration date
    domainOrderRepository.updateOrderStatus(orderId, {
      orderStatus: "completed",
      expiresAt: result.newExpiresAt,
    });

    auditRepository.recordEvent({
      action: "domain.renew",
      actorUserId: order.userId,
      targetType: "domain",
      targetId: order.domainName,
      metadata: {
        orderId,
        newExpiresAt: result.newExpiresAt,
        receiptId: result.receiptId,
      },
    });

    return result;
  }
}
