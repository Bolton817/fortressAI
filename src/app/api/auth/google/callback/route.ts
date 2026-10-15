import { NextResponse } from "next/server";
import { googleOAuthProvider } from "@/core/auth/oauth-provider";
import { sessionManager } from "@/core/auth/session-manager";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "Missing OAuth authorization code" }, { status: 400 });
    }

    // Exchange code for Google identity profile
    const profile = await googleOAuthProvider.exchangeCodeAndFetchProfile(code);

    // Handle account creation / linking
    const user = await googleOAuthProvider.handleOAuthLogin(profile);

    // Create session cookie
    const { cookieHeader } = sessionManager.createSession(user.id, {
      userAgent: request.headers.get("user-agent") || undefined,
    });

    const accept = request.headers.get("accept");
    if (accept && accept.includes("application/json")) {
      const jsonRes = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.emailNormalised,
          displayName: user.displayName,
          emailVerified: true,
        },
      });
      jsonRes.headers.append("Set-Cookie", cookieHeader);
      return jsonRes;
    }

    // Redirect to dashboard on web
    const redirectRes = NextResponse.redirect(new URL("/dashboard", request.url));
    redirectRes.headers.append("Set-Cookie", cookieHeader);
    return redirectRes;
  } catch (err: any) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.json({ error: err.message || "Failed to process Google sign-in" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Support POST with JSON body for testing / mobile clients
  try {
    const body = await request.json();
    const code = body.code;
    if (!code) {
      return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
    }

    const profile = await googleOAuthProvider.exchangeCodeAndFetchProfile(code);
    const user = await googleOAuthProvider.handleOAuthLogin(profile);

    const { cookieHeader } = sessionManager.createSession(user.id, {
      userAgent: request.headers.get("user-agent") || undefined,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.emailNormalised,
        displayName: user.displayName,
        emailVerified: true,
      },
    });
    response.headers.append("Set-Cookie", cookieHeader);
    return response;
  } catch (err: any) {
    console.error("Google OAuth POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to process Google sign-in" }, { status: 500 });
  }
}
