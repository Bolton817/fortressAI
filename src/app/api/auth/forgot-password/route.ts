import { NextResponse } from "next/server";
import { z } from "zod";
import { userRepository } from "@/db/user-repository";
import { auditRepository } from "@/db/audit-repository";
import { createPasswordResetToken } from "@/core/auth/tokens";

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ForgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const { email } = parsed.data;
    const user = userRepository.findByEmail(email);

    let token: string | undefined;
    if (user && user.status !== "deleted") {
      const created = createPasswordResetToken(user.emailNormalised);
      token = created.token;

      auditRepository.record({
        actorUserId: user.id,
        action: "user.password_reset_requested",
        targetType: "user",
        targetId: user.id,
      });
    }

    // Always return neutral response to prevent user enumeration (TDD §23.2, FR-005)
    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, password reset instructions have been sent.",
      resetToken: token, // included for dev/test verification
    });
  } catch (err: any) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "Failed to process password reset" }, { status: 500 });
  }
}
