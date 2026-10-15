import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/auth-guard";
import { usageCreditService } from "@/core/billing/usage-credit-service";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const balance = await usageCreditService.getUsageBalance(user.id);

    return NextResponse.json({
      success: true,
      balance,
    });
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to retrieve usage balance" },
      { status: 500 }
    );
  }
}
