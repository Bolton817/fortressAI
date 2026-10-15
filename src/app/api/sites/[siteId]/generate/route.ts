import { NextRequest, NextResponse } from "next/server";
import { globalPipelineOrchestrator } from "@/ai/orchestrator/pipeline-orchestrator";
import { getJobProgressView } from "@/ai/orchestrator/progress-reporter";
import { tenantRepository } from "@/db/tenant-repository";
import { seedPhase0Tenants } from "@/db/seed-data";
import { getCurrentUser } from "@/core/auth/auth-guard";
import { notificationRepository } from "@/db/notification-repository";

/**
 * Fortress AI — Generation Workflow API (TDD §11.1, §27.3, FR-026, FR-076)
 * Starts or resumes a multi-stage site generation job.
 */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    seedPhase0Tenants();
    const { siteId } = await params;
    const body = await req.json();

    const platformSlug = body.platformSlug || `site-${siteId.slice(0, 8)}`;
    const resumeJobId = body.resumeJobId;

    let job;
    if (resumeJobId) {
      job = await globalPipelineOrchestrator.resumeGeneration(resumeJobId);
    } else {
      job = await globalPipelineOrchestrator.startGeneration({
        siteId,
        platformSlug,
        rawInput: body.rawBrief || body,
      });
    }

    // If authenticated user is present, bind site to user; otherwise fallback to default owner
    const currentUser = await getCurrentUser(req);
    const ownerUserId = currentUser ? currentUser.id : `usr_owner_${siteId.slice(0, 8)}`;

    // If job succeeded, seed into tenant repository so it can be previewed immediately
    if (job.status === "succeeded" && job.finalSiteConfig) {
      tenantRepository.seedSite(
        ownerUserId,
        {
          id: siteId,
          ownerUserId,
          name: job.finalSiteConfig.businessProfile.name,
          platformSlug,
          lifecycleStatus: "draft",
        },
        job.finalSiteConfig
      );

      // Dispatch in-app notification if user is authenticated (FR-013, FR-075)
      if (currentUser) {
        notificationRepository.createNotification({
          userId: currentUser.id,
          siteId,
          idempotencyKey: `notif_build_${job.jobId}`,
          type: "BUILD_SUCCEEDED",
          title: `Website Ready: ${job.finalSiteConfig.businessProfile.name}`,
          body: "Your 5-page website and 3 blog drafts have been generated and are ready for preview.",
          targetRoute: `/preview/${siteId}`,
        });
      }
    } else if (job.status === "failed" && currentUser) {
      notificationRepository.createNotification({
        userId: currentUser.id,
        siteId,
        idempotencyKey: `notif_build_fail_${job.jobId}`,
        type: "BUILD_FAILED",
        title: "Website Generation Interrupted",
        body: "Your generation job encountered an error and is ready to be resumed.",
        targetRoute: `/build?siteId=${siteId}&resumeJobId=${job.jobId}`,
      });
    }

    return NextResponse.json({
      jobId: job.jobId,
      siteId,
      status: job.status,
      progress: getJobProgressView(job),
      siteConfig: job.finalSiteConfig,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: {
          code: "GENERATION_FAILED",
          message: err.message || "Failed to execute generation pipeline",
        },
      },
      { status: 500 }
    );
  }
}
