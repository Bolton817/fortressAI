import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/core/auth/auth-guard";
import { userRepository } from "@/db/user-repository";
import { sessionManager } from "@/core/auth/session-manager";
import { auditRepository } from "@/db/audit-repository";
import { verifyPassword } from "@/core/auth/password";

const DeleteAccountSchema = z.object({
  confirmation: z.literal("DELETE MY ACCOUNT"),
  password: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const parsed = DeleteAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Must confirm by providing exact string 'DELETE MY ACCOUNT'" },
        { status: 400 }
      );
    }

    // If user has a password set, require it
    if (user.passwordHash) {
      if (!parsed.data.password || !verifyPassword(parsed.data.password, user.passwordHash)) {
        return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
      }
    }

    // Soft delete: transition status to deleted
    userRepository.updateUser(user.id, {
      status: "deleted",
    });

    // Revoke all sessions and clear cookie
    sessionManager.revokeAllUserSessions(user.id);
    const expiredCookie = sessionManager.revokeSession("any");

    auditRepository.record({
      actorUserId: user.id,
      action: "user.account_deleted",
      targetType: "user",
      targetId: user.id,
    });

    const response = NextResponse.json({
      success: true,
      message: "Account has been successfully deactivated and queued for deletion.",
    });

    response.headers.append("Set-Cookie", expiredCookie);
    return response;
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
