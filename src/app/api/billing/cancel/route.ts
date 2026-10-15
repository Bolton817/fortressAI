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
        { error: "No active subscription found to cancel" },
        { status: 404 }
      );
    }

    const updated = subscriptionRepository.cancelSubscription(sub.id, true);

    auditRepository.recordEvent({
      actorUserId: user.id,
      action: "billing.subscription_cancelled",
      targetType: "user",
      targetId: user.id,
      metadataJson: {
        subscriptionId: sub.id,
        planId: sub.planId,
        cancelAtPeriodEnd: true,
        effectiveUntil: sub.currentPeriodEnd,
      },
    });

    return NextResponse.json({
      success: true,
      subscription: updated,
      message: `Your subscription will remain active until ${new Date(sub.currentPeriodEnd).toLocaleDateString()}.`,
    });
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to cancel subscription" },
      { status: 400 }
    );
  }
}
