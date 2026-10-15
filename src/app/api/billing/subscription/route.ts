import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/auth-guard";
import { subscriptionRepository } from "@/db/subscription-repository";
import { entitlementService } from "@/core/billing/entitlement-service";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const subscription = subscriptionRepository.getActiveSubscriptionForUser(user.id);
    const plan = await entitlementService.getActivePlan(user.id);

    return NextResponse.json({
      success: true,
      subscription: subscription || {
        planId: "free",
        status: "active",
        billingInterval: "monthly",
        currency: "USD",
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
      },
      plan,
    });
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to retrieve subscription" },
      { status: 500 }
    );
  }
}
