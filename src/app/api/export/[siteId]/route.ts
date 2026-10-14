import { NextResponse } from "next/server";
import { tenantRepository } from "@/db/tenant-repository";
import { seedPhase0Tenants, USER_A_ID, USER_B_ID } from "@/db/seed-data";
import { compileSiteToStatic } from "@/exporter/static-compiler";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ siteId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  seedPhase0Tenants();
  const { siteId } = await params;

  try {
    // Determine tenant context
    const site = await tenantRepository.getSite({ userId: USER_A_ID }, siteId).catch(async () => {
      return await tenantRepository.getSite({ userId: USER_B_ID }, siteId);
    });

    const config = await tenantRepository.getDraftConfiguration({ userId: site.ownerUserId }, siteId);
    const exportResult = compileSiteToStatic(config);

    return NextResponse.json({
      success: true,
      export: exportResult,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: {
          code: "EXPORT_FAILED",
          message: err.message,
          retryable: false,
          requestId: `req_${Date.now()}`,
        },
      },
      { status: 500 }
    );
  }
}
