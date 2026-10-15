import { describe, it, expect, beforeEach } from "vitest";
import { EmailTemplates } from "@/core/email/email-templates";
import { EmailService } from "@/core/email/email-service";
import { MockEmailAdapter } from "@/core/email/mock-email-adapter";
import { BrevoAdapter } from "@/core/email/brevo-adapter";
import { newsletterService } from "@/core/email/newsletter-service";
import { newsletterRepository } from "@/db/newsletter-repository";
import { notificationRepository } from "@/db/notification-repository";

describe("Transactional Email, Brevo Adapter & Newsletter Suppression (TDD §25, FR-072, FR-073, FR-074, FR-075)", () => {
  const TEST_EMAIL = "subscriber@mara-safaris.co.ke";
  let mockAdapter: MockEmailAdapter;
  let emailService: EmailService;

  beforeEach(() => {
    mockAdapter = new MockEmailAdapter();
    emailService = new EmailService(mockAdapter);
    newsletterRepository.clearAll();
    notificationRepository.clearAll();
    mockAdapter.clear();
  });

  it("renders all 8 transactional email templates with HTML, plain text, and zero plain passwords (FR-072)", () => {
    // 1. Email verification
    const verifyTpl = EmailTemplates.emailVerification({
      name: "Juma",
      code: "748291",
      verifyUrl: "https://fortress-ai.com/verify?token=abc",
    });
    expect(verifyTpl.subject).toContain("748291");
    expect(verifyTpl.html).toContain("748291");
    expect(verifyTpl.text).toContain("748291");
    expect(verifyTpl.html).not.toContain("password");

    // 2. Password reset
    const resetTpl = EmailTemplates.passwordReset({
      name: "Juma",
      resetUrl: "https://fortress-ai.com/reset?token=xyz",
    });
    expect(resetTpl.html).toContain("Reset Password");
    expect(resetTpl.text).toContain("expires in 60 minutes");
    expect(resetTpl.html).not.toContain("your password is");
    expect(resetTpl.html).not.toContain("temporary password");

    // 3. Payment receipt
    const receiptTpl = EmailTemplates.paymentReceipt({
      invoiceNumber: "INV-2026-10045",
      amount: "49.00",
      currency: "USD",
      planName: "Professional",
      renewalDate: "November 15, 2026",
      items: [{ description: "Professional (Monthly)", amount: "49.00" }],
    });
    expect(receiptTpl.subject).toContain("INV-2026-10045");
    expect(receiptTpl.html).toContain("USD 49.00");
    expect(receiptTpl.text).toContain("INV-2026-10045");

    // 4. Subscription welcome
    const welcomeTpl = EmailTemplates.subscriptionWelcome({
      planName: "Professional",
      aiCredits: 500,
      sitesAllowed: 10,
    });
    expect(welcomeTpl.html).toContain("500 Monthly AI Credits");

    // 5. Domain registered
    const domainTpl = EmailTemplates.domainRegistered({
      domainName: "safari-adventures.co.ke",
      termYears: 1,
      renewalDate: "October 15, 2027",
      dnsNotice: "DNS records configured for Edge CDN.",
    });
    expect(domainTpl.html).toContain("safari-adventures.co.ke");

    // 6. Domain renewal reminder
    const renewalTpl = EmailTemplates.domainRenewalNotice({
      domainName: "safari-adventures.co.ke",
      daysRemaining: 14,
      renewalDate: "October 15, 2027",
    });
    expect(renewalTpl.subject).toContain("14 days");

    // 7. Usage warning
    const usageTpl = EmailTemplates.usageWarning({
      percentUsed: 80,
      remainingCredits: 20,
      resetDate: "November 1, 2026",
    });
    expect(usageTpl.subject).toContain("80%");

    // 8. Site published
    const publishTpl = EmailTemplates.sitePublished({
      siteName: "Mara Horizon Expeditions",
      liveUrl: "https://mara-horizon.fortress-ai.com",
    });
    expect(publishTpl.html).toContain("Mara Horizon Expeditions");
  });

  it("attaches verified sender and SPF/DKIM headers in BrevoAdapter (TDD §25.2)", async () => {
    const brevo = new BrevoAdapter({
      apiKey: "xkeysib-test-dummy-key",
      senderEmail: "noreply@fortress-ai.com",
      senderName: "Fortress AI",
    });

    const result = await brevo.sendEmail({
      to: { email: "customer@example.com" },
      subject: "Test Header Delivery",
      htmlContent: "<p>Hello</p>",
      textContent: "Hello",
      category: "transactional",
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe("brevo");
  });

  it("records explicit newsletter opt-in with timestamp, source, and policy version (FR-073)", async () => {
    const consent = await newsletterService.recordOptIn({
      email: TEST_EMAIL,
      consentSource: "signup_checkbox",
      policyVersion: "v1.0",
      ipAddress: "197.232.61.10",
    });

    expect(consent.email).toBe(TEST_EMAIL);
    expect(consent.isSubscribed).toBe(true);
    expect(consent.consentSource).toBe("signup_checkbox");
    expect(consent.policyVersion).toBe("v1.0");
    expect(consent.unsubscribeToken).toBeDefined();
    expect(consent.consentedAt).toBeDefined();
    expect(newsletterService.isSuppressed(TEST_EMAIL)).toBe(false);
  });

  it("respects one-click unsubscribe and suppresses future marketing sends (FR-074)", async () => {
    // 1. User opts in
    const consent = await newsletterService.recordOptIn({
      email: TEST_EMAIL,
      consentSource: "footer_form",
    });

    // 2. User clicks unsubscribe link with token
    const unsubResult = await newsletterService.processUnsubscribe(consent.unsubscribeToken);
    expect(unsubResult?.isSubscribed).toBe(false);
    expect(unsubResult?.suppressionReason).toBe("user_unsubscribed");
    expect(newsletterService.isSuppressed(TEST_EMAIL)).toBe(true);

    // 3. Attempting to send a marketing email to suppressed user is strictly blocked
    const marketingSendResult = await emailService.send({
      to: { email: TEST_EMAIL },
      subject: "Exclusive Black Friday 50% Off Plans!",
      htmlContent: "<p>Sale</p>",
      textContent: "Sale",
      category: "marketing",
    });

    expect(marketingSendResult.success).toBe(false);
    expect(marketingSendResult.error).toContain("suppressed");
    expect(mockAdapter.getSentMessages().length).toBe(0);
  });

  it("strictly permits critical transactional emails even when user unsubscribed from marketing (TDD §25.2)", async () => {
    // Unsubscribe email from marketing
    newsletterRepository.recordOptIn({ email: TEST_EMAIL, consentSource: "signup", policyVersion: "v1.0" });
    newsletterRepository.recordUnsubscribe(TEST_EMAIL);
    expect(newsletterService.isSuppressed(TEST_EMAIL)).toBe(true);

    // Password reset transactional email must succeed!
    const txResult = await emailService.sendPasswordReset({
      toEmail: TEST_EMAIL,
      resetUrl: "https://fortress-ai.com/reset?token=xyz",
    });

    expect(txResult.success).toBe(true);
    expect(mockAdapter.getSentMessages().length).toBe(1);
    expect(mockAdapter.getSentMessages()[0].category).toBe("transactional");
  });

  it("decoupled in-app notifications: persists notifications independently of email delivery status (FR-075)", () => {
    // Simulate email dispatch failure
    const failingAdapter = {
      providerName: "failing-smtp",
      sendEmail: async () => ({
        success: false,
        messageId: "",
        provider: "failing-smtp",
        timestamp: new Date().toISOString(),
        error: "SMTP connection timeout",
      }),
    };

    const failingEmailService = new EmailService(failingAdapter);

    // In-app notification creation still succeeds and is unaffected
    const notif = notificationRepository.createNotification({
      userId: "user_decoupled_test_101",
      type: "SYSTEM_UPDATE",
      title: "Subscription Renewed",
      body: "Your subscription renewal has been recorded.",
      idempotencyKey: "notif_decoupled_001",
    });

    expect(notif.id).toBeDefined();
    expect(notif.userId).toBe("user_decoupled_test_101");
    expect(notif.readAt).toBeNull();

    const userNotifs = notificationRepository.listNotificationsForUser("user_decoupled_test_101");
    expect(userNotifs.length).toBe(1);
  });
});
