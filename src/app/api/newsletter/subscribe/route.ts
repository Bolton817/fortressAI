import { NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/auth-guard";
import { newsletterService } from "@/core/email/newsletter-service";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    const body = await request.json();

    const email = body.email || user?.emailNormalised;
    if (!email) {
      return NextResponse.json({ error: "Email address is required" }, { status: 400 });
    }

    const consent = await newsletterService.recordOptIn({
      email,
      userId: user?.id,
      consentSource: body.consentSource || (user ? "account_settings" : "footer_form"),
      policyVersion: body.policyVersion || "v1.0",
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Successfully subscribed to Fortress AI product updates and newsletters.",
      consent: {
        email: consent.email,
        isSubscribed: consent.isSubscribed,
        consentedAt: consent.consentedAt,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process newsletter subscription" },
      { status: 400 }
    );
  }
}
