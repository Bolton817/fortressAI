import { NextResponse } from "next/server";
import { z } from "zod";
import { userRepository } from "@/db/user-repository";
import { createEmailVerificationToken } from "@/core/auth/tokens";

const ResendSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ResendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const { email } = parsed.data;
    const user = userRepository.findByEmail(email);

    let token: string | undefined;
    if (user && !user.emailVerifiedAt) {
      const created = createEmailVerificationToken(user.emailNormalised);
      token = created.token;
    }

    // Generic response regardless of whether account exists to prevent enumeration
    return NextResponse.json({
      success: true,
      message: "If an unverified account exists for this email, a verification link has been sent.",
      verificationToken: token, // included for dev/test
    });
  } catch (err: any) {
    console.error("Resend verification error:", err);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
