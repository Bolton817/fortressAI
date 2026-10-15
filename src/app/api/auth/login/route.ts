import { NextResponse } from "next/server";
import { z } from "zod";
import { userRepository } from "@/db/user-repository";
import { auditRepository } from "@/db/audit-repository";
import { verifyPassword } from "@/core/auth/password";
import { sessionManager, extractSessionTokenFromCookie } from "@/core/auth/session-manager";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const user = userRepository.findByEmail(email);

    // Constant-time check or generic failure to prevent user enumeration
    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (user.status === "suspended" || user.status === "deleted") {
      return NextResponse.json(
        { error: "This account has been deactivated." },
        { status: 403 }
      );
    }

    // Session rotation: if an existing session cookie is present, rotate it
    const existingCookie = request.headers.get("cookie");
    const existingToken = extractSessionTokenFromCookie(existingCookie);

    let cookieHeader: string;

    if (existingToken) {
      const rotated = sessionManager.rotateSession(existingToken, {
        userAgent: request.headers.get("user-agent") || undefined,
      });
      if (rotated) {
        cookieHeader = rotated.cookieHeader;
      } else {
        const created = sessionManager.createSession(user.id, {
          userAgent: request.headers.get("user-agent") || undefined,
        });
        cookieHeader = created.cookieHeader;
      }
    } else {
      const created = sessionManager.createSession(user.id, {
        userAgent: request.headers.get("user-agent") || undefined,
      });
      cookieHeader = created.cookieHeader;
    }

    auditRepository.record({
      actorUserId: user.id,
      action: "user.login",
      targetType: "user",
      targetId: user.id,
      userAgent: request.headers.get("user-agent"),
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.emailNormalised,
        displayName: user.displayName,
        emailVerified: user.emailVerifiedAt !== null,
        status: user.status,
      },
    });

    response.headers.append("Set-Cookie", cookieHeader);
    return response;
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Failed to sign in" }, { status: 500 });
  }
}
