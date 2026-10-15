import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/auth-guard";
import { checkoutService } from "@/core/billing/checkout-service";

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    if (!body.planId) {
      return NextResponse.json({ error: "planId is required" }, { status: 400 });
    }

    const session = await checkoutService.createCheckout({
      userId: user.id,
      customerEmail: user.emailNormalised,
      customerName: user.displayName,
      customerPhone: user.phoneOptional || body.phone,
      planId: body.planId,
      billingInterval: body.billingInterval || "monthly",
      currency: body.currency,
      provider: body.provider,
      domainOrderItems: body.domainOrderItems,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
      idempotencyKey: body.idempotencyKey || request.headers.get("Idempotency-Key") || undefined,
    });

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to initiate checkout" },
      { status: 400 }
    );
  }
}
