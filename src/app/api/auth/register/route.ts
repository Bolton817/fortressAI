import { NextResponse } from "next/server";
import { z } from "zod";
import { userRepository } from "@/db/user-repository";
import { auditRepository } from "@/db/audit-repository";
import { hashPassword, validatePasswordStrength } from "@/core/auth/password";
import { createEmailVerificationToken } from "@/core/auth/tokens";
import { sessionManager } from "@/core/auth/session-manager";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(100),
  phoneOptional: z.string().optional(),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms of service and privacy policy to continue.",
  }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, password, displayName, phoneOptional, termsAccepted } = parsed.data;

    // Password strength check
    const pwCheck = validatePasswordStrength(password);
    if (!pwCheck.valid) {
      return NextResponse.json(
        { error: "Weak password", issues: pwCheck.errors },
        { status: 400 }
      );
    }

    // Check if email already registered
    const existing = userRepository.findByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email address already exists." },
        { status: 409 }
      );
    }

    // Hash password with scrypt
    const passwordHash = hashPassword(password);

    // Create user in unverified state
    const user = userRepository.createUser({
      email,
      passwordHash,
      displayName,
      phoneOptional,
      status: "unverified",
      termsAcceptedAt: termsAccepted ? new Date() : undefined,
      policyVersion: "1.0",
    });

    // Record audit event
    auditRepository.record({
      actorUserId: user.id,
      action: "user.register",
      targetType: "user",
      targetId: user.id,
      userAgent: request.headers.get("user-agent"),
    });

    // Generate single-use verification token
    const { token } = createEmailVerificationToken(user.emailNormalised);

    // Issue initial session cookie
    const { cookieHeader } = sessionManager.createSession(user.id, {
      userAgent: request.headers.get("user-agent") || undefined,
    });

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.emailNormalised,
          displayName: user.displayName,
          emailVerified: false,
          status: user.status,
        },
        verificationToken: token, // included for dev/test verification
      },
      { status: 201 }
    );

    response.headers.append("Set-Cookie", cookieHeader);
    return response;
  } catch (err: any) {
    console.error("Registration error:", err);
    return NextResponse.json({ error: err.message || "Failed to register account" }, { status: 500 });
  }
}
