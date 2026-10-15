import { notificationRepository, NotificationRecord } from "@/db/notification-repository";

/**
 * Fortress AI — Notification Subsystem (TDD §25, FR-013, FR-075)
 * Handles idempotent event creation and tenant isolation for in-app notifications.
 */

export class NotificationService {
  public notifyBuildSucceeded(data: {
    userId: string;
    siteId: string;
    siteName: string;
    jobId: string;
  }): NotificationRecord {
    return notificationRepository.createNotification({
      userId: data.userId,
      siteId: data.siteId,
      idempotencyKey: `build_succeeded_${data.jobId}`,
      type: "BUILD_SUCCEEDED",
      title: `Website Built: ${data.siteName}`,
      body: "Your 5-page website and 3 blog drafts are ready for preview.",
      targetRoute: `/preview/${data.siteId}`,
    });
  }

  public notifyBuildFailed(data: {
    userId: string;
    siteId: string;
    jobId: string;
    errorMessage?: string;
  }): NotificationRecord {
    return notificationRepository.createNotification({
      userId: data.userId,
      siteId: data.siteId,
      idempotencyKey: `build_failed_${data.jobId}`,
      type: "BUILD_FAILED",
      title: "Generation Halted",
      body: data.errorMessage || "Your site generation job paused and can be resumed from the last checkpoint.",
      targetRoute: `/build?siteId=${data.siteId}&resumeJobId=${data.jobId}`,
    });
  }

  public notifySecurityAlert(data: {
    userId: string;
    action: string;
    description: string;
  }): NotificationRecord {
    const eventId = crypto.randomUUID();
    return notificationRepository.createNotification({
      userId: data.userId,
      idempotencyKey: `sec_alert_${eventId}`,
      type: "SECURITY_ALERT",
      title: "Security Notice",
      body: data.description,
      targetRoute: "/dashboard/profile",
    });
  }

  public notifySystemUpdate(data: {
    userId: string;
    title: string;
    body: string;
    version: string;
  }): NotificationRecord {
    return notificationRepository.createNotification({
      userId: data.userId,
      idempotencyKey: `system_update_${data.version}`,
      type: "SYSTEM_UPDATE",
      title: data.title,
      body: data.body,
      targetRoute: "/dashboard",
    });
  }

  public notifySitePublished(data: {
    userId: string;
    siteId: string;
    releaseNumber: number;
    publishedUrl: string;
  }): NotificationRecord {
    return notificationRepository.createNotification({
      userId: data.userId,
      siteId: data.siteId,
      idempotencyKey: `publish_${data.siteId}_rel_${data.releaseNumber}`,
      type: "BUILD_SUCCEEDED",
      title: `Website Published (Release #${data.releaseNumber})`,
      body: "Your website has been successfully published and is now live.",
      targetRoute: data.publishedUrl,
    });
  }

  public notifySiteRolledBack(data: {
    userId: string;
    siteId: string;
    releaseNumber: number;
    publishedUrl: string;
  }): NotificationRecord {
    const timestamp = Date.now();
    return notificationRepository.createNotification({
      userId: data.userId,
      siteId: data.siteId,
      idempotencyKey: `rollback_${data.siteId}_rel_${data.releaseNumber}_${timestamp}`,
      type: "BUILD_SUCCEEDED",
      title: `Website Rolled Back to Release #${data.releaseNumber}`,
      body: `Your live website has been reverted to Release #${data.releaseNumber}. All newer releases remain preserved in your history.`,
      targetRoute: data.publishedUrl,
    });
  }
}

export const notificationService = new NotificationService();
