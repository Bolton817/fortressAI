import { newsletterRepository, StoredNewsletterConsent } from "@/db/newsletter-repository";

/**
 * Fortress AI — Newsletter Consent & Suppression Service (TDD §25.1, §25.2, FR-073, FR-074)
 * Invariants:
 * - Marketing consent is separate from transactional service messages.
 * - Consent check cannot be pre-selected.
 * - An unsubscribed recipient receives zero subsequent marketing campaigns.
 */

export class NewsletterService {
  /**
   * Records explicit opt-in with full consent evidence (FR-073).
   */
  async recordOptIn(params: {
    email: string;
    userId?: string;
    consentSource: "signup_checkbox" | "footer_form" | "account_settings";
    policyVersion?: string;
    ipAddress?: string;
  }): Promise<StoredNewsletterConsent> {
    return newsletterRepository.recordOptIn({
      email: params.email,
      userId: params.userId,
      consentSource: params.consentSource,
      policyVersion: params.policyVersion || "v1.0",
      ipAddress: params.ipAddress,
    });
  }

  /**
   * Processes one-click unsubscribe token or direct email suppression (FR-074).
   */
  async processUnsubscribe(
    tokenOrEmail: string,
    reason: string = "user_unsubscribed"
  ): Promise<StoredNewsletterConsent | null> {
    return newsletterRepository.recordUnsubscribe(tokenOrEmail, reason);
  }

  /**
   * Checks whether an email address is currently suppressed from receiving marketing communications.
   */
  isSuppressed(email: string): boolean {
    return newsletterRepository.isSuppressed(email);
  }

  /**
   * Gets consent record for an email.
   */
  getConsent(email: string): StoredNewsletterConsent | null {
    return newsletterRepository.getByEmail(email);
  }

  /**
   * Helper generating the secure one-click unsubscribe URL.
   */
  buildUnsubscribeUrl(baseUrl: string, token: string): string {
    return `${baseUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
  }
}

export const newsletterService = new NewsletterService();
