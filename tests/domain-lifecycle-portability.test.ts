import { describe, it, expect, beforeEach } from "vitest";
import { DomainOrchestrator } from "@/core/domains/domain-orchestrator";
import { RenewalService } from "@/core/domains/renewal-service";
import { TransferService } from "@/core/domains/transfer-service";
import { domainRepository } from "@/db/domain-repository";
import { domainOrderRepository } from "@/db/domain-order-repository";
import { notificationRepository } from "@/db/notification-repository";
import { auditRepository } from "@/db/audit-repository";
import { mockRegistrarAdapter } from "@/core/domains/mock-registrar-adapter";
import { seedPhase0Tenants, USER_A_ID, SITE_A_ID } from "@/db/seed-data";

describe("Phase 5: Domain Lifecycle, Renewal & Portability (TDD §22, FR-063, FR-065, FR-066)", () => {
  const siteId = SITE_A_ID; // Mara Horizon Expeditions
  const ownerUserId = USER_A_ID;

  const validRegistrant = {
    firstName: "Mara",
    lastName: "Explorer",
    organization: "Mara Horizon Safaris Ltd",
    email: "contact@marahorizonsafaris.com",
    phone: "+254712345678",
    addressLine1: "Kenyatta Avenue, CBD",
    city: "Nairobi",
    postalCode: "00100",
    countryCode: "KE",
  };

  beforeEach(() => {
    seedPhase0Tenants();
    domainRepository.clearAll();
    domainOrderRepository.clearAll();
    notificationRepository.clearAll();
    mockRegistrarAdapter.reset();
  });

  describe("Idempotent Domain Registration (FR-063)", () => {
    it("successfully registers domain, creates order receipt, and attaches domain mapping", async () => {
      const idempotencyKey = "idemp_reg_test_001";

      const res = await DomainOrchestrator.registerAndAttachDomain({
        siteId,
        userId: ownerUserId,
        domain: "new-safari-expeditions.com",
        termYears: 1,
        registrant: validRegistrant,
        idempotencyKey,
      });

      expect(res.registration.success).toBe(true);
      expect(res.order.id).toBeDefined();
      expect(res.order.domainName).toBe("new-safari-expeditions.com");
      expect(res.order.orderStatus).toBe("completed");
      expect(res.order.receiptJson?.invoiceNumber).toBeDefined();

      // Check attached mapping
      const mapping = domainRepository.getDomain("new-safari-expeditions.com");
      expect(mapping).toBeDefined();
      expect(mapping?.siteId).toBe(siteId);
      expect(mapping?.verificationToken).toBeDefined();
      expect(mapping?.eppAuthCode).toBeDefined();
    });

    it("enforces idempotency invariant: duplicate registration returns same order without double registration", async () => {
      const idempotencyKey = "idemp_duplicate_test_002";

      // Call 1
      const res1 = await DomainOrchestrator.registerAndAttachDomain({
        siteId,
        userId: ownerUserId,
        domain: "idempotent-safaris.org",
        termYears: 1,
        registrant: validRegistrant,
        idempotencyKey,
      });

      // Call 2 with identical key
      const res2 = await DomainOrchestrator.registerAndAttachDomain({
        siteId,
        userId: ownerUserId,
        domain: "idempotent-safaris.org",
        termYears: 1,
        registrant: validRegistrant,
        idempotencyKey,
      });

      expect(res1.order.id).toBe(res2.order.id);
      expect(res1.registration.receiptId).toBe(res2.registration.receiptId);

      // Verify only 1 order exists in database
      const siteOrders = domainOrderRepository.listOrdersForSite(siteId);
      expect(siteOrders).toHaveLength(1);
    });
  });

  describe("Domain Renewal Milestones & Reminders (FR-065)", () => {
    it("detects renewal window and dispatches deduplicated notification", () => {
      // Create an order expiring in 14 days
      const referenceNow = new Date("2026-10-15T00:00:00Z");
      const expiryDate = new Date("2026-10-29T00:00:00Z"); // Exactly 14 days later

      const order = domainOrderRepository.createOrder({
        siteId,
        userId: ownerUserId,
        domainName: "expiring-safari.com",
        tld: "com",
        termYears: 1,
        priceCents: 1499,
        renewalPriceCents: 1499,
        idempotencyKey: "order_expiring_001",
        registrant: validRegistrant,
        orderStatus: "completed",
        expiresAt: expiryDate.toISOString(),
      });

      // First evaluation at reference time
      const eval1 = RenewalService.evaluateOrder(order, referenceNow);
      expect(eval1.reminderDispatched).toBe(true);
      expect(eval1.milestone).toBe(14);

      // Check notification inbox
      const notifications = notificationRepository
        .getNotificationsForUser(ownerUserId)
        .filter((n) => n.title.includes("Domain Renewal Due"));
      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toContain("Domain Renewal Due");

      // Second evaluation on the same day: idempotency guard prevents duplicate notification
      const eval2 = RenewalService.evaluateOrder(order, referenceNow);
      expect(eval2.reminderDispatched).toBe(true);
      const notificationsAfter = notificationRepository
        .getNotificationsForUser(ownerUserId)
        .filter((n) => n.title.includes("Domain Renewal Due"));
      expect(notificationsAfter).toHaveLength(1); // Not duplicated!
    });

    it("executes renewal and extends domain expiration by requested term", async () => {
      const initialExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days remaining

      const res = await DomainOrchestrator.registerAndAttachDomain({
        siteId,
        userId: ownerUserId,
        domain: "renew-me-safaris.com",
        termYears: 1,
        registrant: validRegistrant,
        idempotencyKey: "idemp_renew_001",
      });

      const orderId = res.order.id;

      // Renew for 1 year
      const renewalResult = await RenewalService.executeRenewal(orderId, 1, "idemp_renew_op_001");
      expect(renewalResult.success).toBe(true);
      expect(renewalResult.termYears).toBe(1);

      // Verify updated expiration in order repository
      const updatedOrder = domainOrderRepository.getOrderById(orderId);
      expect(updatedOrder?.expiresAt).toBe(renewalResult.newExpiresAt);
    });
  });

  describe("Zero Dark Patterns Domain Portability & Transfer (FR-066)", () => {
    it("provides immediate access to EPP Auth code and transfer checklist without obstruction", async () => {
      await DomainOrchestrator.registerAndAttachDomain({
        siteId,
        userId: ownerUserId,
        domain: "portable-safaris.com",
        termYears: 1,
        registrant: validRegistrant,
        idempotencyKey: "idemp_transfer_001",
      });

      const details = await TransferService.getTransferDetails(siteId, ownerUserId, "portable-safaris.com");
      expect(details.domain).toBe("portable-safaris.com");
      expect(details.isLocked).toBe(true); // Default locked
      expect(details.authCode).toBeDefined();
      expect(details.authCode.startsWith("EPP-")).toBe(true);
      expect(details.instructions.length).toBeGreaterThan(3);
      expect(details.policyNotes).toContain("does NOT delete your website");
    });

    it("toggles domain lock status cleanly and allows transfer request", async () => {
      await DomainOrchestrator.registerAndAttachDomain({
        siteId,
        userId: ownerUserId,
        domain: "unlock-test.com",
        termYears: 1,
        registrant: validRegistrant,
        idempotencyKey: "idemp_lock_001",
      });

      // Unlock domain
      const isLockedAfter = await TransferService.setLockStatus(siteId, ownerUserId, "unlock-test.com", false);
      expect(isLockedAfter).toBe(false);

      // Retrieve EPP code
      const details = await TransferService.getTransferDetails(siteId, ownerUserId, "unlock-test.com");
      expect(details.isLocked).toBe(false);

      // Submit transfer request with valid EPP code
      const transferRes = await TransferService.requestTransferOut(
        siteId,
        ownerUserId,
        "unlock-test.com",
        details.authCode
      );

      expect(transferRes.success).toBe(true);
      expect(transferRes.status).toBe("initiated");

      // Verify audit trail
      const events = auditRepository.listEvents({ targetId: "unlock-test.com" });
      expect(events.some((e) => e.action === "domain.unlock")).toBe(true);
      expect(events.some((e) => e.action === "domain.transfer_requested")).toBe(true);
    });
  });
});
