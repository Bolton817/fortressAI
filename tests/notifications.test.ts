import { describe, it, expect, beforeEach } from "vitest";
import { notificationRepository } from "@/db/notification-repository";
import { notificationService } from "@/core/notifications/notification-service";

describe("Phase 3: Notification Subsystem & Idempotency (TDD §25, FR-013, FR-075)", () => {
  const userIdA = "usr_notif_tenant_a";
  const userIdB = "usr_notif_tenant_b";
  const siteIdA = "site_notif_001";

  beforeEach(() => {
    notificationRepository.clearAll();
  });

  it("creates notification and accurately counts unread items", () => {
    notificationService.notifyBuildSucceeded({
      userId: userIdA,
      siteId: siteIdA,
      siteName: "Serengeti Safaris",
      jobId: "job_111",
    });

    expect(notificationRepository.countUnreadForUser(userIdA)).toBe(1);
    const notifs = notificationRepository.findForUser(userIdA);
    expect(notifs.length).toBe(1);
    expect(notifs[0].title).toContain("Serengeti Safaris");
    expect(notifs[0].type).toBe("BUILD_SUCCEEDED");
  });

  it("enforces idempotency deduplication on repeated domain events", () => {
    const jobKey = "job_build_444";

    const n1 = notificationService.notifyBuildSucceeded({
      userId: userIdA,
      siteId: siteIdA,
      siteName: "Mara Trails",
      jobId: jobKey,
    });

    const n2 = notificationService.notifyBuildSucceeded({
      userId: userIdA,
      siteId: siteIdA,
      siteName: "Mara Trails",
      jobId: jobKey,
    });

    // Both calls must return identical notification ID without duplicating the unread counter
    expect(n1.id).toBe(n2.id);
    expect(notificationRepository.countUnreadForUser(userIdA)).toBe(1);
  });

  it("maintains strict tenant isolation (Tenant B cannot read or mark Tenant A's notifications)", () => {
    const notifA = notificationService.notifySecurityAlert({
      userId: userIdA,
      action: "user.login",
      description: "New sign-in from Safari Chrome",
    });

    // Tenant B inbox must be empty
    expect(notificationRepository.findForUser(userIdB).length).toBe(0);
    expect(notificationRepository.countUnreadForUser(userIdB)).toBe(0);

    // Tenant B cannot mark Tenant A's notification as read
    const marked = notificationRepository.markAsRead(notifA.id, userIdB);
    expect(marked).toBe(false);

    // Tenant A's notification must still be unread
    expect(notificationRepository.countUnreadForUser(userIdA)).toBe(1);

    // Tenant A can mark their own notification as read
    const markedOwn = notificationRepository.markAsRead(notifA.id, userIdA);
    expect(markedOwn).toBe(true);
    expect(notificationRepository.countUnreadForUser(userIdA)).toBe(0);
  });
});
