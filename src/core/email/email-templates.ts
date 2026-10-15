/**
 * Fortress AI — Email Templates Engine (TDD §25.1, §25.2, FR-072)
 * Clean, accessible HTML email templates with plain-text fallbacks.
 * Invariant: No plain-text passwords or long-lived authentication tokens.
 */

function layoutWrapper(title: string, bodyContent: string, plainFooterText: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 8px; overflow: hidden; margin-top: 24px; margin-bottom: 24px; border: 1px solid #334155; }
    .header { background-color: #0284c7; padding: 24px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .content { padding: 32px 24px; color: #e2e8f0; line-height: 1.6; }
    .content h2 { color: #ffffff; font-size: 20px; margin-top: 0; }
    .button { display: inline-block; background-color: #0284c7; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .footer { background-color: #0f172a; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #334155; }
    .card { background-color: #0f172a; border-radius: 6px; padding: 16px; margin: 16px 0; border: 1px solid #334155; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; background-color: #0369a1; color: #e0f2fe; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #334155; font-size: 14px; }
    th { color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>FORTRESS AI</h1>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Fortress AI by MegaScript Digital. All rights reserved.</p>
      <p>${plainFooterText}</p>
    </div>
  </div>
</body>
</html>`;
}

export class EmailTemplates {
  static emailVerification(params: { name?: string; code: string; verifyUrl: string }): {
    html: string;
    text: string;
    subject: string;
  } {
    const subject = `Verify your email address — ${params.code}`;
    const greeting = params.name ? `Hello ${params.name},` : "Hello,";

    const body = `
      <h2>Verify your email address</h2>
      <p>${greeting}</p>
      <p>Thank you for joining Fortress AI. Use the verification code below to confirm your account:</p>
      <div class="card" style="text-align: center;">
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #38bdf8;">${params.code}</span>
      </div>
      <p>Or click the button below to verify your account directly:</p>
      <div style="text-align: center;">
        <a href="${params.verifyUrl}" class="button">Verify Account</a>
      </div>
      <p style="font-size: 13px; color: #94a3b8;">This code and link will expire in 24 hours. If you did not create a Fortress AI account, please ignore this email.</p>
    `;

    const text = `${greeting}\n\nThank you for joining Fortress AI.\n\nYour verification code is: ${params.code}\n\nOr verify directly at:\n${params.verifyUrl}\n\nThis link expires in 24 hours.`;

    return {
      subject,
      html: layoutWrapper("Verify Email — Fortress AI", body, "Security notice: Transactional verification message."),
      text,
    };
  }

  static passwordReset(params: { name?: string; resetUrl: string }): {
    html: string;
    text: string;
    subject: string;
  } {
    const subject = "Reset your Fortress AI password";
    const greeting = params.name ? `Hello ${params.name},` : "Hello,";

    const body = `
      <h2>Password Reset Request</h2>
      <p>${greeting}</p>
      <p>We received a request to reset the password for your Fortress AI account. Click the button below to choose a new password:</p>
      <div style="text-align: center;">
        <a href="${params.resetUrl}" class="button">Reset Password</a>
      </div>
      <p style="font-size: 13px; color: #94a3b8;">For your security, this link expires in 60 minutes and can only be used once. If you did not request a password reset, no action is needed.</p>
    `;

    const text = `${greeting}\n\nWe received a request to reset your Fortress AI password.\n\nReset your password at:\n${params.resetUrl}\n\nThis link expires in 60 minutes. If you did not request this, please ignore this email.`;

    return {
      subject,
      html: layoutWrapper("Password Reset — Fortress AI", body, "Security notice: Password reset request."),
      text,
    };
  }

  static paymentReceipt(params: {
    invoiceNumber: string;
    amount: string;
    currency: string;
    planName: string;
    renewalDate: string;
    items: Array<{ description: string; amount: string }>;
  }): { html: string; text: string; subject: string } {
    const subject = `Receipt for Invoice ${params.invoiceNumber} — Fortress AI`;

    let rowsHtml = "";
    let rowsText = "";
    for (const item of params.items) {
      rowsHtml += `<tr><td>${item.description}</td><td style="text-align: right;">${item.amount}</td></tr>`;
      rowsText += `- ${item.description}: ${item.amount}\n`;
    }

    const body = `
      <h2>Payment Receipt & Confirmation</h2>
      <p>Thank you for your payment! Here is the summary of your transaction:</p>
      <div class="card">
        <p><strong>Invoice Number:</strong> ${params.invoiceNumber}</p>
        <p><strong>Plan / Service:</strong> ${params.planName}</p>
        <p><strong>Next Renewal Date:</strong> ${params.renewalDate}</p>
      </div>
      <table>
        <thead>
          <tr><th>Description</th><th style="text-align: right;">Amount</th></tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr>
            <td style="font-weight: bold; padding-top: 12px;">Total Paid</td>
            <td style="text-align: right; font-weight: bold; color: #38bdf8; font-size: 16px; padding-top: 12px;">${params.currency} ${params.amount}</td>
          </tr>
        </tbody>
      </table>
      <p style="font-size: 13px; color: #94a3b8;">You can view and download all past invoices in your Fortress AI Billing Dashboard.</p>
    `;

    const text = `Payment Receipt — Invoice ${params.invoiceNumber}\n\nPlan: ${params.planName}\nTotal Paid: ${params.currency} ${params.amount}\nNext Renewal Date: ${params.renewalDate}\n\nItems:\n${rowsText}\n\nThank you for choosing Fortress AI!`;

    return {
      subject,
      html: layoutWrapper("Payment Receipt — Fortress AI", body, "Financial document: Keep for your tax records."),
      text,
    };
  }

  static subscriptionWelcome(params: {
    planName: string;
    aiCredits: number;
    sitesAllowed: number;
  }): { html: string; text: string; subject: string } {
    const subject = `Welcome to Fortress AI ${params.planName}!`;

    const body = `
      <h2>Your ${params.planName} Plan is Active!</h2>
      <p>Welcome! Your subscription has been successfully provisioned. Here are your included entitlements:</p>
      <div class="card">
        <p>✨ <strong>${params.aiCredits} Monthly AI Credits</strong> for website & section generation</p>
        <p>🌐 <strong>${params.sitesAllowed} Website(s)</strong> managed in your dashboard</p>
        <p>⚡ <strong>Global Edge CDN & Instant Publishing</strong></p>
      </div>
      <div style="text-align: center;">
        <a href="/dashboard" class="button">Go to Dashboard</a>
      </div>
    `;

    const text = `Welcome to Fortress AI ${params.planName}!\n\nYour plan is now active with:\n- ${params.aiCredits} Monthly AI Credits\n- ${params.sitesAllowed} Website(s)\n- Edge CDN & Custom Domains\n\nAccess your dashboard at: /dashboard`;

    return {
      subject,
      html: layoutWrapper("Welcome to Fortress AI", body, "Account notification: Subscription activated."),
      text,
    };
  }

  static domainRegistered(params: {
    domainName: string;
    termYears: number;
    renewalDate: string;
    dnsNotice: string;
  }): { html: string; text: string; subject: string } {
    const subject = `Domain Registered: ${params.domainName} — Fortress AI`;

    const body = `
      <h2>Domain Registration Confirmed</h2>
      <p>Great news! <strong>${params.domainName}</strong> has been successfully registered under your name.</p>
      <div class="card">
        <p><strong>Domain:</strong> ${params.domainName}</p>
        <p><strong>Registration Term:</strong> ${params.termYears} year(s)</p>
        <p><strong>Renewal Date:</strong> ${params.renewalDate}</p>
      </div>
      <p>${params.dnsNotice}</p>
      <div style="text-align: center;">
        <a href="/dashboard/websites" class="button">Manage Domain</a>
      </div>
    `;

    const text = `Domain Registered: ${params.domainName}\nTerm: ${params.termYears} year(s)\nRenewal Date: ${params.renewalDate}\n\n${params.dnsNotice}\n\nManage in dashboard: /dashboard/websites`;

    return {
      subject,
      html: layoutWrapper("Domain Registered — Fortress AI", body, "ICANN / Registry notice: Official registrant confirmation."),
      text,
    };
  }

  static domainRenewalNotice(params: {
    domainName: string;
    daysRemaining: number;
    renewalDate: string;
  }): { html: string; text: string; subject: string } {
    const subject = `Action Required: ${params.domainName} expires in ${params.daysRemaining} days`;

    const body = `
      <h2>Domain Renewal Reminder</h2>
      <p>Your domain <strong>${params.domainName}</strong> is scheduled to expire in <strong>${params.daysRemaining} day(s)</strong> on ${params.renewalDate}.</p>
      <div class="card">
        <p>To ensure uninterrupted website uptime and email routing, auto-renewal will be processed prior to expiry.</p>
      </div>
      <p style="font-size: 13px; color: #94a3b8;">Fortress AI guarantees zero dark patterns: You can transfer your domain out at any time with immediate EPP auth code retrieval from your domain management tab.</p>
    `;

    const text = `Renewal Notice: ${params.domainName} expires in ${params.daysRemaining} days on ${params.renewalDate}.\n\nRenew or manage your domain in your Fortress AI dashboard.`;

    return {
      subject,
      html: layoutWrapper("Domain Renewal Notice — Fortress AI", body, "Domain lifecycle notification."),
      text,
    };
  }

  static usageWarning(params: {
    percentUsed: number;
    remainingCredits: number;
    resetDate: string;
  }): { html: string; text: string; subject: string } {
    const subject = `AI Allowance Alert: You have used ${params.percentUsed}% of your monthly credits`;

    const body = `
      <h2>AI Usage Allowance Alert</h2>
      <p>You have utilized <strong>${params.percentUsed}%</strong> of your monthly AI generation credits.</p>
      <div class="card">
        <p><strong>Remaining Credits:</strong> ${params.remainingCredits}</p>
        <p><strong>Cycle Reset Date:</strong> ${params.resetDate}</p>
      </div>
      <p>Once your balance reaches 0, you will be unable to generate new AI content until the reset date. Your existing published websites and editing tools remain fully operational.</p>
      <div style="text-align: center;">
        <a href="/dashboard/billing" class="button">Upgrade or Top-up</a>
      </div>
    `;

    const text = `AI Allowance Alert: You have used ${params.percentUsed}% of your credits.\nRemaining: ${params.remainingCredits}\nReset Date: ${params.resetDate}\n\nManage in billing: /dashboard/billing`;

    return {
      subject,
      html: layoutWrapper("AI Credit Alert — Fortress AI", body, "Operational notification: Monthly allowance status."),
      text,
    };
  }

  static sitePublished(params: {
    siteName: string;
    liveUrl: string;
    domainNotice?: string;
  }): { html: string; text: string; subject: string } {
    const subject = `Your site "${params.siteName}" is live on the web!`;

    const body = `
      <h2>Congratulations! Your Website is Published</h2>
      <p>Your website <strong>${params.siteName}</strong> is live and deployed to the global edge network.</p>
      <div class="card" style="text-align: center;">
        <a href="${params.liveUrl}" style="color: #38bdf8; font-size: 18px; font-weight: bold; text-decoration: none;">${params.liveUrl}</a>
      </div>
      ${params.domainNotice ? `<p>${params.domainNotice}</p>` : ""}
    `;

    const text = `Your site "${params.siteName}" is published!\n\nLive URL: ${params.liveUrl}\n\n${params.domainNotice || ""}`;

    return {
      subject,
      html: layoutWrapper("Site Published — Fortress AI", body, "Deployment notification: Release is live."),
      text,
    };
  }
}
