import { NextResponse } from "next/server";
import { requireSiteOwnership } from "@/core/auth/auth-guard";
import { domainRepository } from "@/db/domain-repository";
import { DomainOrchestrator } from "@/core/domains/domain-orchestrator";
import { DnsAdvisor } from "@/core/domains/dns-advisor";

export async function POST(
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

    const result = await DomainOrchestrator.verifyCustomDomain({
      siteId,
      userId: user.id,
      rawHostname: mapping.hostname,
    });

    return NextResponse.json({
      success: result.dnsResult.success,
      dnsResult: result.dnsResult,
      tlsResult: result.tlsResult,
      mapping: {
        ...result.mapping,
        dnsRecords: DnsAdvisor.getRecordsForDomain(result.mapping),
      },
    });
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err.statusCode === 403 || err.name === "TenantAccessDeniedError") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to verify domain" },
      { status: err.statusCode || 400 }
    );
  }
}
