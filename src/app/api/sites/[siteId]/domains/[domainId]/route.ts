import { NextResponse } from "next/server";
import { requireSiteOwnership } from "@/core/auth/auth-guard";
import { domainRepository } from "@/db/domain-repository";
import { DomainOrchestrator } from "@/core/domains/domain-orchestrator";

export async function DELETE(
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

    DomainOrchestrator.detachCustomDomain({
      siteId,
      userId: user.id,
      rawHostname: mapping.hostname,
    });

    return NextResponse.json({ success: true, message: "Domain detached successfully." });
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err.statusCode === 403 || err.name === "TenantAccessDeniedError") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to detach domain" },
      { status: err.statusCode || 400 }
    );
  }
}
