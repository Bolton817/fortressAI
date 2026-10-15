import { NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/auth-guard";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.emailNormalised,
        displayName: user.displayName,
        phoneOptional: user.phoneOptional,
        timezone: user.timezone,
        status: user.status,
        emailVerified: user.emailVerifiedAt !== null,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    console.error("Auth me error:", err);
    return NextResponse.json({ authenticated: false, user: null });
  }
}
