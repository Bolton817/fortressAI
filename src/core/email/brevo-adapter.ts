import { EmailAdapter, SendEmailOptions, SendEmailResult } from "./email-adapter";

/**
 * Fortress AI — Brevo Transactional Email Adapter (TDD §25.1, §25.2, FR-072)
 * Dispatches transactional and consent-based platform messages via Brevo API v3.
 */

export class BrevoAdapter implements EmailAdapter {
  public readonly providerName = "brevo";
  private apiKey: string;
  private senderEmail: string;
  private senderName: string;

  constructor(options?: { apiKey?: string; senderEmail?: string; senderName?: string }) {
    this.apiKey = options?.apiKey || process.env.BREVO_API_KEY || "xkeysib-test-dummy-key";
    this.senderEmail = options?.senderEmail || process.env.BREVO_SENDER_EMAIL || "noreply@fortress-ai.com";
    this.senderName = options?.senderName || "Fortress AI";
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const timestamp = new Date().toISOString();

    // Verify sender address requirement (TDD §25.2)
    if (!this.senderEmail || !this.senderEmail.includes("@")) {
      return {
        success: false,
        messageId: "",
        provider: this.providerName,
        timestamp,
        error: "Verified sender email domain is required.",
      };
    }

    const payload = {
      sender: {
        email: this.senderEmail,
        name: this.senderName,
      },
      to: [
        {
          email: options.to.email,
          name: options.to.name || options.to.email,
        },
      ],
      replyTo: options.replyTo
        ? { email: options.replyTo.email, name: options.replyTo.name }
        : undefined,
      subject: options.subject,
      htmlContent: options.htmlContent,
      textContent: options.textContent,
      tags: options.tags || ["fortress-ai", options.category || "transactional"],
      headers: {
        "X-Mailer": "FortressAI-BrevoMailer/1.0",
        "X-Entity-Ref-ID": `fortress-${Date.now()}`,
        ...(options.headers || {}),
      },
    };

    // If using dummy key in test/dev environment, return simulated success with message ID
    if (this.apiKey.startsWith("xkeysib-test-dummy") || process.env.NODE_ENV === "test") {
      return {
        success: true,
        messageId: `brevo_sim_${Date.now()}`,
        provider: this.providerName,
        timestamp,
      };
    }

    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "api-key": this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          messageId: "",
          provider: this.providerName,
          timestamp,
          error: `Brevo API error (${response.status}): ${errorText}`,
        };
      }

      const resData = (await response.json()) as { messageId?: string };
      return {
        success: true,
        messageId: resData.messageId || `brevo_${Date.now()}`,
        provider: this.providerName,
        timestamp,
      };
    } catch (err: any) {
      return {
        success: false,
        messageId: "",
        provider: this.providerName,
        timestamp,
        error: `Network error dispatching Brevo email: ${err.message}`,
      };
    }
  }
}

export const brevoAdapter = new BrevoAdapter();
