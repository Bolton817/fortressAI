import { NextResponse } from "next/server";
import { webhookProcessor } from "@/core/billing/webhook-processor";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    // Check signatures from supported providers
    const signature =
      request.headers.get("x-signature") ||
      request.headers.get("x-intasend-signature") ||
      request.headers.get("stripe-signature") ||
      "";

    const providerHeader = request.headers.get("x-provider") || "mock";

    const result = await webhookProcessor.processWebhook({
      providerName: providerHeader,
      rawBody,
      signature,
    });

    if (!result.success) {
      if (result.error?.includes("signature")) {
        return NextResponse.json({ error: result.error }, { status: 401 });
      }
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      received: true,
      status: result.status,
      isDuplicate: result.isDuplicate,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process webhook" },
      { status: 500 }
    );
  }
}
