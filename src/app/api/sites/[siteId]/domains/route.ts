import { NextResponse } from "next/server";
import { requireSiteOwnership } from "@/core/auth/auth-guard";
import { domainRepository } from "@/db/domain-repository";
import { domainOrderRepository } from "@/db/domain-order-repository";
import { DnsAdvisor } from "@/core/domains/dns-advisor";
import { DomainOrchestrator } from "@/core/domains/domain-orchestrator";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    await requireSiteOwnership(request, siteId);

    const domains = domainRepository.listDomainsForSite(siteId);
    const orders = domainOrderRepository.listOrdersForSite(siteId);

    const enrichedDomains = domains.map((d) => ({
      ...d,
      dnsRecords: DnsAdvisor.getRecordsForDomain(d),
    }));

    return NextResponse.json({
      success: true,
      domains: enrichedDomains,
      orders,
    });
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err.statusCode === 403 || err.name === "TenantAccessDeniedError") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to list domains" },
      { status: err.statusCode || 400 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const { user } = await requireSiteOwnership(request, siteId);
    const body = await request.json().catch(() => ({}));

    if (!body?.hostname) {
      return NextResponse.json(
        { error: "Hostname is required to attach custom domain." },
        { status: 400 }
      );
    }

    const mapping = DomainOrchestrator.attachCustomDomain({
      siteId,
      userId: user.id,
      rawHostname: body.hostname,
      isPrimary: Boolean(body.isPrimary),
    });

    return NextResponse.json({
      success: true,
      mapping: {
        ...mapping,
        dnsRecords: DnsAdvisor.getRecordsForDomain(mapping),
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
      { error: err.message || "Failed to attach domain" },
      { status: err.statusCode || 400 }
    );
  }
}
