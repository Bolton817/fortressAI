import { NextResponse } from "next/server";
import { requireSiteOwnership } from "@/core/auth/auth-guard";
import { domainRepository } from "@/db/domain-repository";
import { TransferService } from "@/core/domains/transfer-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string; domainId: string }> }
) {
  try {
    const { siteId, domainId } = await params;
    const { user } = await requireSiteOwnership(request, siteId);

    const mapping = domainRepository.getDomainById(domainId);
    if (!mapping || mapping.siteId !== siteId) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    const details = await TransferService.getTransferDetails(siteId, user.id, mapping.hostname);
    return NextResponse.json({ success: true, details });
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err.statusCode === 403 || err.name === "TenantAccessDeniedError") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to get transfer details" },
      { status: err.statusCode || 400 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteId: string; domainId: string }> }
) {
  try {
    const { siteId, domainId } = await params;
    const { user } = await requireSiteOwnership(request, siteId);
    const body = await request.json().catch(() => ({}));

    const mapping = domainRepository.getDomainById(domainId);
    if (!mapping || mapping.siteId !== siteId) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    const result = await TransferService.requestTransferOut(
      siteId,
      user.id,
      mapping.hostname,
      body?.authCode
    );

    return NextResponse.json({ success: result.success, result });
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err.statusCode === 403 || err.name === "TenantAccessDeniedError") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to initiate transfer" },
      { status: err.statusCode || 400 }
    );
  }
}
