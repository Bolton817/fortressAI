import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/core/auth/auth-guard";
import { userRepository } from "@/db/user-repository";
import { auditRepository } from "@/db/audit-repository";

const ProfileUpdateSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  phoneOptional: z.string().max(30).optional(),
  timezone: z.string().max(50).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        email: user.emailNormalised,
        displayName: user.displayName,
        phoneOptional: user.phoneOptional,
        timezone: user.timezone,
        status: user.status,
        emailVerified: user.emailVerifiedAt !== null,
        emailVerifiedAt: user.emailVerifiedAt,
        termsAcceptedAt: user.termsAcceptedAt,
        policyVersion: user.policyVersion,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const parsed = ProfileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    // Only update allowlisted fields (TDD §23.4, FR-007)
    const updated = userRepository.updateUser(user.id, {
      displayName: parsed.data.displayName !== undefined ? parsed.data.displayName : user.displayName,
      phoneOptional: parsed.data.phoneOptional !== undefined ? parsed.data.phoneOptional : user.phoneOptional,
      timezone: parsed.data.timezone !== undefined ? parsed.data.timezone : user.timezone,
    });

    auditRepository.record({
      actorUserId: user.id,
      action: "user.profile_updated",
      targetType: "user",
      targetId: user.id,
      metadataJson: parsed.data,
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      profile: {
        id: updated.id,
        email: updated.emailNormalised,
        displayName: updated.displayName,
        phoneOptional: updated.phoneOptional,
        timezone: updated.timezone,
        status: updated.status,
        emailVerified: updated.emailVerifiedAt !== null,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
