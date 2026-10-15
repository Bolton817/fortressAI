import { NextResponse } from "next/server";
import { requireSiteOwnership } from "@/core/auth/auth-guard";
import { domainRepository } from "@/db/domain-repository";
import { TransferService } from "@/core/domains/transfer-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteId: string; domainId: string }> }
) {
  try {
    const { siteId, domainId } = await params;
    const { user } = await requireSiteOwnership(request, siteId);
    const body = await request.json().catch(() => ({}));

    if (body?.isLocked === undefined) {
      return NextResponse.json({ error: "isLocked boolean is required." }, { status: 400 });
    }

    const mapping = domainRepository.getDomainById(domainId);
    if (!mapping || mapping.siteId !== siteId) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    const isLocked = await TransferService.setLockStatus(
      siteId,
      user.id,
      mapping.hostname,
      Boolean(body.isLocked)
    );

    return NextResponse.json({ success: true, isLocked });
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err.statusCode === 403 || err.name === "TenantAccessDeniedError") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to toggle domain lock" },
      { status: err.statusCode || 400 }
    );
  }
}
