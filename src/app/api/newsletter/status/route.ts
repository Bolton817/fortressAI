import { NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/auth-guard";
import { newsletterService } from "@/core/email/newsletter-service";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const consent = newsletterService.getConsent(user.emailNormalised);
    const isSuppressed = newsletterService.isSuppressed(user.emailNormalised);

    return NextResponse.json({
      success: true,
      email: user.emailNormalised,
      isSubscribed: consent ? consent.isSubscribed : false,
      isSuppressed,
      consentedAt: consent?.consentedAt,
      unsubscribedAt: consent?.unsubscribedAt,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to retrieve newsletter status" },
      { status: 500 }
    );
  }
}
