import { NextResponse } from "next/server";
import { sessionManager, extractSessionTokenFromCookie } from "@/core/auth/session-manager";
import { auditRepository } from "@/db/audit-repository";

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const token = extractSessionTokenFromCookie(cookieHeader);

    let expiredCookie = "";
    if (token) {
      const session = sessionManager.getSessionFromToken(token);
      if (session) {
        auditRepository.record({
          actorUserId: session.userId,
          action: "user.logout",
          targetType: "session",
          targetId: session.id,
        });
      }
      expiredCookie = sessionManager.revokeSession(token);
    }

    const response = NextResponse.json({ success: true, message: "Logged out successfully." });
    if (expiredCookie) {
      response.headers.append("Set-Cookie", expiredCookie);
    }
    return response;
  } catch (err: any) {
    console.error("Logout error:", err);
    return NextResponse.json({ error: "Failed to log out" }, { status: 500 });
  }
}
