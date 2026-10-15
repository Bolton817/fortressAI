import { NextResponse } from "next/server";
import { googleOAuthProvider } from "@/core/auth/oauth-provider";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const state = url.searchParams.get("state") || undefined;
    const authUrl = googleOAuthProvider.generateAuthUrl(state);

    // If client requested JSON, return the URL; otherwise redirect directly
    const accept = request.headers.get("accept");
    if (accept && accept.includes("application/json")) {
      return NextResponse.json({ url: authUrl });
    }

    return NextResponse.redirect(new URL(authUrl, request.url));
  } catch (err: any) {
    console.error("Google OAuth start error:", err);
    return NextResponse.json({ error: "Failed to initiate Google sign-in" }, { status: 500 });
  }
}
