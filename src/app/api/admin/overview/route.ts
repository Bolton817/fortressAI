import { NextRequest, NextResponse } from "next/server";
import { RbacGuard, UserRole } from "@/core/auth/rbac-guard";
import { metricsCollector } from "@/core/observability/metrics-collector";
import { auditRepository } from "@/db/audit-repository";

/**
 * Fortress AI — Admin Operations Overview API (TDD §32.4, §42.3, FR-087)
 * Serves aggregated operational panels with role-based redaction.
 */

export async function GET(req: NextRequest): Promise<NextResponse> {
  const role = (req.headers.get("x-user-role") || "admin") as UserRole;

  try {
    RbacGuard.assertRole(role, ["admin", "support"], "access operational dashboard");
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Unauthorized" },
      { status: 403 }
    );
  }

  const metrics = metricsCollector.getMetricsSnapshot();
  const recentAudits = auditRepository.listEvents().slice(-20).reverse();

  const overview = {
    timestamp: new Date().toISOString(),
    callerRole: role,
    panels: {
      generationHealth: {
        totalGenerations: metrics.ai.totalGenerations,
        successRate:
          metrics.ai.totalGenerations > 0
            ? Math.round((metrics.ai.successfulGenerations / metrics.ai.totalGenerations) * 100)
            : 100,
        creditsDebited: metrics.ai.totalCreditsDebited,
        avgDurationMs: metrics.ai.avgGenerationDurationMs,
        activeJobs: 0,
        queueAgeSeconds: 0,
      },
      publishingHealth: {
        publishedReleases: metrics.publishing.releasesPublished,
        rollbacksExecuted: metrics.publishing.rollbacksExecuted,
        successRate: metrics.publishing.publishSuccessRate,
      },
      domainOperations: {
        registrations: metrics.domains.registrations,
        verifications: metrics.domains.verifications,
        renewals: metrics.domains.renewals,
        failures: metrics.domains.failures,
      },
      billingIntegrity: {
        checkouts: metrics.billing.checkouts,
        webhooksProcessed: metrics.billing.webhooksProcessed,
        duplicateWebhooksPrevented: metrics.billing.duplicateWebhooksIgnored,
      },
      systemLatency: {
        p50Ms: metrics.requests.latency.p50,
        p95Ms: metrics.requests.latency.p95,
        p99Ms: metrics.requests.latency.p99,
        errorRate: metrics.requests.errorRate,
      },
      recentAuditLogs: recentAudits.map((a) => ({
        id: a.id,
        action: a.action,
        targetType: a.targetType,
        targetId: a.targetId,
        actorUserId: a.actorUserId,
        outcome: a.outcome,
        reason: a.reason,
        createdAt: a.createdAt,
      })),
    },
  };

  // Sanitize if caller is support
  const finalPayload = RbacGuard.sanitizeDiagnosticPayload(role, overview);

  return NextResponse.json(finalPayload, {
    status: 200,
    headers: {
      "Cache-Control": "private, no-cache, no-store",
    },
  });
}
