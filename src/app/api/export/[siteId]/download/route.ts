import { NextResponse } from "next/server";
import { exportService } from "@/core/export/export-service";
import { tenantRepository } from "@/db/tenant-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ siteId: string }>;
}

/**
 * GET /api/export/[siteId]/download?token=...
 * Secure streaming download for exported ZIP package.
 * Enforces HMAC signature verification and expiration check.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { siteId } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      {
        error: {
          code: "MISSING_DOWNLOAD_TOKEN",
          message: "A valid signed download token is required to access export artifacts.",
        },
      },
      { status: 401 }
    );
  }

  try {
    const { zipBuffer, exportId } = await exportService.getExportArtifact(siteId, token);

    // Get site platform slug for friendly filename
    let slug = "fortress-site";
    try {
      const site = await tenantRepository.getSite({ userId: "usr_tenant_a_law" }, siteId).catch(async () => {
        return await tenantRepository.getSite({ userId: "usr_tenant_b_safari" }, siteId);
      });
      if (site) slug = site.platformSlug;
    } catch {
      slug = `site-${siteId}`;
    }

    const filename = `${slug}-static-export.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": zipBuffer.length.toString(),
        "X-Export-Id": exportId,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : "Download failed";
    const status = message.includes("Unauthorized") ? 403 : 404;

    return NextResponse.json(
      {
        error: {
          code: "DOWNLOAD_FAILED",
          message,
        },
      },
      { status }
    );
  }
}
