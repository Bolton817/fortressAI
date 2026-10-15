import { NextResponse } from "next/server";
import { z } from "zod";
import { userRepository } from "@/db/user-repository";
import { auditRepository } from "@/db/audit-repository";
import { verifyAndConsumeToken } from "@/core/auth/tokens";

const VerifySchema = z.object({
  email: z.string().email(),
  token: z.string().min(16),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = VerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, token } = parsed.data;
    const user = userRepository.findByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid verification link or code." },
        { status: 400 }
      );
    }

    const valid = verifyAndConsumeToken(token, user.emailNormalised, "email_verify");
    if (!valid) {
      return NextResponse.json(
        { error: "Verification token is invalid or has expired." },
        { status: 400 }
      );
    }

    // Update user to verified active status
    const updated = userRepository.updateUser(user.id, {
      emailVerifiedAt: new Date(),
      status: "active",
    });

    auditRepository.record({
      actorUserId: user.id,
      action: "user.email_verified",
      targetType: "user",
      targetId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Email verified successfully.",
      user: {
        id: updated.id,
        email: updated.emailNormalised,
        emailVerified: true,
      },
    });
  } catch (err: any) {
    console.error("Email verification error:", err);
    return NextResponse.json({ error: "Failed to verify email" }, { status: 500 });
  }
}
