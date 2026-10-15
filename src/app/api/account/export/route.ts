import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/auth-guard";
import { dataPortabilityService } from "@/core/export/data-portability-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/account/export
 * Customer Data Portability Endpoint (TDD §30.1–§30.3, FR-084)
 * Returns a comprehensive, structured JSON export of all customer-owned content and records.
 * Invariant: Internal platform prompts, server secrets, and other tenant data are strictly excluded.
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const exportBundle = await dataPortabilityService.generateAccountExport(user.id);

    return NextResponse.json(exportBundle, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="fortress-account-export-${user.id}.json"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: any) {
    if (err.statusCode === 401 || err.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Failed to export account data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
