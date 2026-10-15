import { NextResponse } from "next/server";
import { PlanCatalog } from "@/core/billing/plan-catalog";

export async function GET() {
  try {
    const plans = PlanCatalog.getAllPlans();
    return NextResponse.json({
      success: true,
      plans,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to retrieve plans" },
      { status: 500 }
    );
  }
}
