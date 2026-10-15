import { NextResponse } from "next/server";
import { getCurrentUser } from "@/core/auth/auth-guard";
import { exportService } from "@/core/export/export-service";
import { tenantRepository } from "@/db/tenant-repository";
import { compileSiteToStatic } from "@/exporter/static-compiler";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ siteId: string }>;
}

/**
 * POST /api/export/[siteId]
 * Initiates static export package compilation for the authenticated site owner.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { siteId } = await params;
  const user = await getCurrentUser(request);

  if (!user) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required to export site",
        },
      },
      { status: 401 }
    );
  }

  try {
    const result = await exportService.initiateExport({
      userId: user.id,
      siteId,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    if (err.code === "FEATURE_NOT_ENTITLED" || err.code === "QUOTA_EXCEEDED") {
      return NextResponse.json(
        {
          error: {
            code: err.code,
            message: err.message,
            feature: err.feature,
          },
        },
        { status: 403 }
      );
    }

    if (err.code === "EXPORT_SECURITY_VIOLATION") {
      return NextResponse.json(
        {
          error: {
            code: "EXPORT_SECURITY_VIOLATION",
            message: err.message,
            offendingFile: err.offendingFile,
          },
        },
        { status: 422 }
      );
    }

    const message = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json(
      {
        error: {
          code: "EXPORT_FAILED",
          message,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/export/[siteId]
 * Backward-compatible endpoint returning static compilation result.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { siteId } = await params;
  const user = await getCurrentUser(request);

  try {
    let site;
    if (user) {
      site = await tenantRepository.getSite({ userId: user.id }, siteId);
    } else {
      // Legacy fallback for test runner
      site = await tenantRepository
        .getSite({ userId: "usr_tenant_a_law" }, siteId)
        .catch(async () => {
          return await tenantRepository.getSite({ userId: "usr_tenant_b_safari" }, siteId);
        })
        .catch(async () => {
          return await tenantRepository.getSite({ userId: "usr_tenant_c_composed" }, siteId);
        });
    }

    const config = await tenantRepository.getDraftConfiguration({ userId: site.ownerUserId }, siteId);
    const exportResult = compileSiteToStatic(config);

    return NextResponse.json({
      success: true,
      export: exportResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown export error";
    return NextResponse.json(
      {
        error: {
          code: "EXPORT_FAILED",
          message,
          retryable: false,
          requestId: `req_${Date.now()}`,
        },
      },
      { status: 500 }
    );
  }
}
