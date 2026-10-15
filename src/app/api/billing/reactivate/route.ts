import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/auth-guard";
import { subscriptionRepository } from "@/db/subscription-repository";
import { auditRepository } from "@/db/audit-repository";

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const sub = subscriptionRepository.getActiveSubscriptionForUser(user.id);

    if (!sub) {
      return NextResponse.json(
        { error: "No active subscription found to reactivate" },
        { status: 404 }
      );
    }

    const updated = subscriptionRepository.reactivateSubscription(sub.id);

    auditRepository.recordEvent({
      actorUserId: user.id,
      action: "billing.subscription_reactivated",
      targetType: "user",
      targetId: user.id,
      metadataJson: {
        subscriptionId: sub.id,
        planId: sub.planId,
      },
    });

    return NextResponse.json({
      success: true,
      subscription: updated,
      message: "Subscription successfully reactivated and scheduled to renew automatically.",
    });
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to reactivate subscription" },
      { status: 400 }
    );
  }
}
