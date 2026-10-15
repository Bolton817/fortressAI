import { userRepository } from "@/db/user-repository";
import { tenantRepository } from "@/db/tenant-repository";
import { subscriptionRepository } from "@/db/subscription-repository";
import { invoiceRepository } from "@/db/invoice-repository";
import { usageCreditRepository } from "@/db/usage-credit-repository";
import { newsletterRepository } from "@/db/newsletter-repository";
import { notificationRepository } from "@/db/notification-repository";
import { auditRepository } from "@/db/audit-repository";
import { AccountExportBundle } from "./types";

/**
 * Fortress AI — Customer Data Portability Service (TDD §30.1–§30.3, FR-084)
 * Generates an authoritative, privacy-compliant JSON export of all customer-owned content and records.
 * Invariant: Never export internal AI prompt templates, system credentials, or other tenants' data.
 */

export class DataPortabilityService {
  async generateAccountExport(userId: string): Promise<AccountExportBundle> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // 1. Fetch user sites with their draft configurations & release histories
    const sites = await tenantRepository.listSitesForUser(userId);
    const sitesData: Array<{
      site: any;
      draftConfiguration?: any;
      publishedRevisions?: any[];
    }> = [];

    for (const site of sites) {
      let draftConfig = null;
      let releases: any[] = [];
      try {
        draftConfig = await tenantRepository.getDraftConfiguration({ userId }, site.id);
      } catch {
        draftConfig = null;
      }

      try {
        releases = await tenantRepository.listReleases({ userId }, site.id);
      } catch {
        releases = [];
      }

      sitesData.push({
        site: {
          id: site.id,
          name: site.name,
          platformSlug: site.platformSlug,
          lifecycleStatus: site.lifecycleStatus,
          publishedReleaseId: site.publishedReleaseId,
        },
        draftConfiguration: draftConfig,
        publishedRevisions: releases,
      });
    }

    // 2. Billing & Financial records
    const sub = subscriptionRepository.getActiveSubscriptionForUser(userId);
    const invoices = invoiceRepository.listInvoicesForUser(userId);
    const usage = usageCreditRepository.getLedgerForUser(userId);

    // 3. Privacy, Consent & Notifications
    const newsletterConsent = newsletterRepository.getConsent(user.emailNormalised);
    const notifications = notificationRepository.findForUser(userId);
    const auditLogs = auditRepository.findByActor(userId);

    // 4. Record audit entry for data portability request
    auditRepository.record({
      actorUserId: userId,
      action: "account.data_portability_exported",
      targetType: "user",
      targetId: userId,
    });

    return {
      exportVersion: "1.0.0",
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.emailNormalised,
        displayName: user.displayName,
        phoneOptional: user.phoneOptional,
        timezone: user.timezone,
        status: user.status,
        emailVerifiedAt: user.emailVerifiedAt
          ? user.emailVerifiedAt instanceof Date
            ? user.emailVerifiedAt.toISOString()
            : String(user.emailVerifiedAt)
          : null,
        termsAcceptedAt: user.termsAcceptedAt
          ? user.termsAcceptedAt instanceof Date
            ? user.termsAcceptedAt.toISOString()
            : String(user.termsAcceptedAt)
          : null,
        policyVersion: user.policyVersion || null,
        createdAt:
          user.createdAt instanceof Date
            ? user.createdAt.toISOString()
            : String(user.createdAt),
      },
      sites: sitesData,
      billing: {
        subscription: sub || null,
        invoices: invoices.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          currency: inv.currency,
          amountMinorUnits: inv.amountMinorUnits,
          status: inv.status,
          paidAt: inv.paidAt,
          lineItems: inv.lineItemsJson,
          createdAt: inv.createdAt,
        })),
        usageHistory: usage,
      },
      privacyAndConsent: {
        newsletterConsent: newsletterConsent
          ? {
              status: newsletterConsent.isSubscribed ? "subscribed" : "unsubscribed",
              isSubscribed: newsletterConsent.isSubscribed,
              subscribedAt: newsletterConsent.consentedAt,
              unsubscribedAt: newsletterConsent.unsubscribedAt,
              optInSource: newsletterConsent.consentSource,
            }
          : null,
        auditLogs: auditLogs.slice(0, 100), // Recent 100 audit events
        notifications: notifications.slice(0, 100),
      },
    };
  }
}

export const dataPortabilityService = new DataPortabilityService();
