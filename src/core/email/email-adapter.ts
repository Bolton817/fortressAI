/**
 * Fortress AI — Standardized Email Provider Adapter Interface (TDD §25.1, §25.2, FR-072)
 * Abstraction for Brevo transactional email and deterministic mock mailer.
 */

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailOptions {
  to: EmailRecipient;
  subject: string;
  htmlContent: string;
  textContent: string;
  replyTo?: EmailRecipient;
  tags?: string[];
  headers?: Record<string, string>;
  category?: "transactional" | "operational" | "marketing" | "domain";
}

export interface SendEmailResult {
  success: boolean;
  messageId: string;
  provider: string;
  timestamp: string;
  error?: string;
}

export interface EmailAdapter {
  readonly providerName: string;
  sendEmail(options: SendEmailOptions): Promise<SendEmailResult>;
}
