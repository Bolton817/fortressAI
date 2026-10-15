import { EmailAdapter, SendEmailOptions, SendEmailResult } from "./email-adapter";
import { mockEmailAdapter } from "./mock-email-adapter";
import { brevoAdapter } from "./brevo-adapter";
import { newsletterService } from "./newsletter-service";
import { EmailTemplates } from "./email-templates";

/**
 * Fortress AI — Central Email Service (TDD §25.1, §25.2, FR-072, FR-074)
 * Orchestrates transactional and marketing email delivery with strict deliverability and suppression guards.
 */

export class EmailService {
  private adapter: EmailAdapter;

  constructor(adapter?: EmailAdapter) {
    // In production with real Brevo key, use Brevo; otherwise default to MockEmailAdapter
    const hasBrevoKey =
      process.env.BREVO_API_KEY &&
      !process.env.BREVO_API_KEY.startsWith("xkeysib-test-dummy");
    this.adapter = adapter || (hasBrevoKey ? brevoAdapter : mockEmailAdapter);
  }

  setAdapter(adapter: EmailAdapter) {
    this.adapter = adapter;
  }

  getAdapter(): EmailAdapter {
    return this.adapter;
  }

  /**
   * Dispatches email with deliverability and suppression enforcement.
   */
  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const category = options.category || "transactional";

    // Marketing Suppression Invariant (FR-074):
    // If message is marketing, check if recipient is suppressed
    if (category === "marketing") {
      if (newsletterService.isSuppressed(options.to.email)) {
        return {
          success: false,
          messageId: "",
          provider: this.adapter.providerName,
          timestamp: new Date().toISOString(),
          error: "Recipient has unsubscribed or is suppressed from marketing campaigns.",
        };
      }
    }

    // Transactional messages are strictly permitted even if user unsubscribed from marketing
    return this.adapter.sendEmail(options);
  }

  // --- Convenience Transactional Dispatchers ---

  async sendEmailVerification(params: {
    toEmail: string;
    toName?: string;
    code: string;
    verifyUrl: string;
  }): Promise<SendEmailResult> {
    const template = EmailTemplates.emailVerification({
      name: params.toName,
      code: params.code,
      verifyUrl: params.verifyUrl,
    });

    return this.send({
      to: { email: params.toEmail, name: params.toName },
      subject: template.subject,
      htmlContent: template.html,
      textContent: template.text,
      category: "transactional",
    });
  }

  async sendPasswordReset(params: {
    toEmail: string;
    toName?: string;
    resetUrl: string;
  }): Promise<SendEmailResult> {
    const template = EmailTemplates.passwordReset({
      name: params.toName,
      resetUrl: params.resetUrl,
    });

    return this.send({
      to: { email: params.toEmail, name: params.toName },
      subject: template.subject,
      htmlContent: template.html,
      textContent: template.text,
      category: "transactional",
    });
  }

  async sendPaymentReceipt(params: {
    toEmail: string;
    toName?: string;
    invoiceNumber: string;
    amount: string;
    currency: string;
    planName: string;
    renewalDate: string;
    items: Array<{ description: string; amount: string }>;
  }): Promise<SendEmailResult> {
    const template = EmailTemplates.paymentReceipt(params);

    return this.send({
      to: { email: params.toEmail, name: params.toName },
      subject: template.subject,
      htmlContent: template.html,
      textContent: template.text,
      category: "transactional",
    });
  }

  async sendSubscriptionWelcome(params: {
    toEmail: string;
    toName?: string;
    planName: string;
    aiCredits: number;
    sitesAllowed: number;
  }): Promise<SendEmailResult> {
    const template = EmailTemplates.subscriptionWelcome(params);

    return this.send({
      to: { email: params.toEmail, name: params.toName },
      subject: template.subject,
      htmlContent: template.html,
      textContent: template.text,
      category: "operational",
    });
  }

  async sendDomainRegistered(params: {
    toEmail: string;
    toName?: string;
    domainName: string;
    termYears: number;
    renewalDate: string;
    dnsNotice: string;
  }): Promise<SendEmailResult> {
    const template = EmailTemplates.domainRegistered(params);

    return this.send({
      to: { email: params.toEmail, name: params.toName },
      subject: template.subject,
      htmlContent: template.html,
      textContent: template.text,
      category: "domain",
    });
  }

  async sendDomainRenewalNotice(params: {
    toEmail: string;
    toName?: string;
    domainName: string;
    daysRemaining: number;
    renewalDate: string;
  }): Promise<SendEmailResult> {
    const template = EmailTemplates.domainRenewalNotice(params);

    return this.send({
      to: { email: params.toEmail, name: params.toName },
      subject: template.subject,
      htmlContent: template.html,
      textContent: template.text,
      category: "domain",
    });
  }

  async sendUsageWarning(params: {
    toEmail: string;
    toName?: string;
    percentUsed: number;
    remainingCredits: number;
    resetDate: string;
  }): Promise<SendEmailResult> {
    const template = EmailTemplates.usageWarning(params);

    return this.send({
      to: { email: params.toEmail, name: params.toName },
      subject: template.subject,
      htmlContent: template.html,
      textContent: template.text,
      category: "operational",
    });
  }

  async sendSitePublished(params: {
    toEmail: string;
    toName?: string;
    siteName: string;
    liveUrl: string;
    domainNotice?: string;
  }): Promise<SendEmailResult> {
    const template = EmailTemplates.sitePublished(params);

    return this.send({
      to: { email: params.toEmail, name: params.toName },
      subject: template.subject,
      htmlContent: template.html,
      textContent: template.text,
      category: "operational",
    });
  }
}

export const emailService = new EmailService();
