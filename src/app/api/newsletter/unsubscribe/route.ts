import { NextResponse } from "next/server";
import { newsletterService } from "@/core/email/newsletter-service";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { searchParams } = new URL(request.url);
    const token = body.token || searchParams.get("token") || body.email;

    if (!token) {
      return NextResponse.json(
        { error: "Unsubscribe token or email is required" },
        { status: 400 }
      );
    }

    const result = await newsletterService.processUnsubscribe(token, "user_unsubscribed");

    if (!result) {
      return NextResponse.json(
        { error: "Subscription record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "You have been successfully unsubscribed from Fortress AI marketing emails. You will receive no further marketing campaigns.",
      email: result.email,
      unsubscribedAt: result.unsubscribedAt,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process unsubscribe" },
      { status: 400 }
    );
  }
}

export async function GET(request: Request) {
  // Support one-click link click directly in browser
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (token) {
    await newsletterService.processUnsubscribe(token, "one_click_link");
    return new Response(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0f172a;color:#f8fafc;padding:40px;text-align:center;"><h2>Unsubscribed Successfully</h2><p>You have been removed from our marketing list. You will not receive any further newsletter campaigns from Fortress AI.</p><p><a href="/" style="color:#38bdf8;">Return to Fortress AI</a></p></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  return NextResponse.json({ error: "Missing token" }, { status: 400 });
}
