import { NextResponse } from "next/server";
import { requireSiteOwnership } from "@/core/auth/auth-guard";
import { DomainOrchestrator } from "@/core/domains/domain-orchestrator";
import { DnsAdvisor } from "@/core/domains/dns-advisor";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const { user } = await requireSiteOwnership(request, siteId);
    const body = await request.json().catch(() => ({}));

    if (!body?.domain) {
      return NextResponse.json({ error: "Domain name is required." }, { status: 400 });
    }
    if (!body?.registrant || !body?.registrant?.email) {
      return NextResponse.json({ error: "Registrant contact details are required." }, { status: 400 });
    }

    const idempotencyKey = body.idempotencyKey || `reg_${siteId}_${body.domain}_${Date.now()}`;

    const result = await DomainOrchestrator.registerAndAttachDomain({
      siteId,
      userId: user.id,
      domain: body.domain,
      termYears: body.termYears || 1,
      registrant: body.registrant,
      idempotencyKey,
      autoRenew: body.autoRenew ?? true,
    });

    return NextResponse.json({
      success: true,
      order: result.order,
      registration: result.registration,
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
      { error: err.message || "Failed to register domain" },
      { status: err.statusCode || 400 }
    );
  }
}
