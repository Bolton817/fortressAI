import { NextResponse } from "next/server";
import { z } from "zod";
import { userRepository } from "@/db/user-repository";
import { auditRepository } from "@/db/audit-repository";
import { hashPassword, validatePasswordStrength } from "@/core/auth/password";
import { verifyAndConsumeToken } from "@/core/auth/tokens";
import { sessionManager } from "@/core/auth/session-manager";

const ResetPasswordSchema = z.object({
  email: z.string().email(),
  token: z.string().min(16),
  newPassword: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ResetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, token, newPassword } = parsed.data;

    const pwCheck = validatePasswordStrength(newPassword);
    if (!pwCheck.valid) {
      return NextResponse.json(
        { error: "Weak password", issues: pwCheck.errors },
        { status: 400 }
      );
    }

    const user = userRepository.findByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired password reset link." },
        { status: 400 }
      );
    }

    const valid = verifyAndConsumeToken(token, user.emailNormalised, "password_reset");
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid or expired password reset link." },
        { status: 400 }
      );
    }

    // Update password hash
    const newHash = hashPassword(newPassword);
    userRepository.updateUser(user.id, {
      passwordHash: newHash,
    });

    // Invalidate ALL existing sessions for this user (TDD §23.2, FR-005 security invariant)
    sessionManager.revokeAllUserSessions(user.id);

    auditRepository.record({
      actorUserId: user.id,
      action: "user.password_reset_completed",
      targetType: "user",
      targetId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. Please sign in with your new password.",
    });
  } catch (err: any) {
    console.error("Password reset error:", err);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
