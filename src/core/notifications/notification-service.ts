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

  public notifyDomainRegistered(data: {
    userId: string;
    siteId: string;
    domain: string;
    receiptId: string;
  }): NotificationRecord {
    return notificationRepository.createNotification({
      userId: data.userId,
      siteId: data.siteId,
      idempotencyKey: `domain_reg_${data.domain}_${data.receiptId}`,
      type: "SYSTEM_UPDATE",
      title: `Domain Registered: ${data.domain}`,
      body: `Your domain ${data.domain} has been successfully registered. Complete the DNS challenge to activate live traffic.`,
      targetRoute: `/dashboard/websites/${data.siteId}`,
    });
  }

  public notifyDomainRenewalDue(data: {
    userId: string;
    siteId: string;
    domain: string;
    daysRemaining: number;
    expiresAt: string;
  }): NotificationRecord {
    return notificationRepository.createNotification({
      userId: data.userId,
      siteId: data.siteId,
      idempotencyKey: `domain_renewal_${data.domain}_${data.daysRemaining}d`,
      type: "SECURITY_ALERT",
      title: `Domain Renewal Due: ${data.domain}`,
      body: `Your domain ${data.domain} expires in ${data.daysRemaining} days (on ${new Date(data.expiresAt).toLocaleDateString()}). Please verify renewal payment to ensure uninterrupted site access.`,
      targetRoute: `/dashboard/websites/${data.siteId}`,
    });
  }

  public notifyDomainTransferred(data: {
    userId: string;
    siteId: string;
    domain: string;
  }): NotificationRecord {
    return notificationRepository.createNotification({
      userId: data.userId,
      siteId: data.siteId,
      idempotencyKey: `domain_transfer_${data.domain}_${Date.now()}`,
      type: "SYSTEM_UPDATE",
      title: `Domain Transfer Initiated: ${data.domain}`,
      body: `Domain transfer authorization code for ${data.domain} has been issued and domain lock unlocked.`,
      targetRoute: `/dashboard/websites/${data.siteId}`,
    });
  }

  public notifySubscriptionActivated(data: {
    userId: string;
    planName: string;
    interval: string;
  }): NotificationRecord {
    return notificationRepository.createNotification({
      userId: data.userId,
      idempotencyKey: `sub_activated_${data.userId}_${data.planName}_${Date.now()}`,
      type: "SYSTEM_UPDATE",
      title: `${data.planName} Subscription Active`,
      body: `Your ${data.planName} plan (${data.interval}) is now active. All included feature quotas and AI credits have been provisioned.`,
      targetRoute: "/dashboard/billing",
    });
  }

  public notifyPaymentReceived(data: {
    userId: string;
    invoiceNumber: string;
    amountFormatted: string;
  }): NotificationRecord {
    return notificationRepository.createNotification({
      userId: data.userId,
      idempotencyKey: `payment_rcvd_${data.invoiceNumber}`,
      type: "SYSTEM_UPDATE",
      title: `Payment Received — ${data.amountFormatted}`,
      body: `Thank you for your payment! Invoice ${data.invoiceNumber} has been marked paid and is available in your billing history.`,
      targetRoute: "/dashboard/billing",
    });
  }

  public notifyPaymentFailed(data: {
    userId: string;
    reason?: string;
  }): NotificationRecord {
    return notificationRepository.createNotification({
      userId: data.userId,
      idempotencyKey: `payment_failed_${data.userId}_${Date.now()}`,
      type: "SECURITY_ALERT",
      title: "Subscription Renewal Payment Failed",
      body: data.reason || "We were unable to charge your payment method. Your account is in a grace period. Please update your billing details.",
      targetRoute: "/dashboard/billing",
    });
  }

  public notifyUsageWarning(data: {
    userId: string;
    percentUsed: number;
    remainingCredits: number;
  }): NotificationRecord {
    return notificationRepository.createNotification({
      userId: data.userId,
      idempotencyKey: `usage_warn_${data.userId}_${data.percentUsed}`,
      type: "SECURITY_ALERT",
      title: `AI Usage Alert: ${data.percentUsed}% Credits Used`,
      body: `You have ${data.remainingCredits} AI generation credits remaining for the current cycle.`,
      targetRoute: "/dashboard/billing",
    });
  }
}

export const notificationService = new NotificationService();
