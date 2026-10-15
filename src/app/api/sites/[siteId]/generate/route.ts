import { NextRequest, NextResponse } from "next/server";
import { globalPipelineOrchestrator } from "@/ai/orchestrator/pipeline-orchestrator";
import { getJobProgressView } from "@/ai/orchestrator/progress-reporter";
import { tenantRepository } from "@/db/tenant-repository";
import { seedPhase0Tenants } from "@/db/seed-data";

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

    // If job succeeded, seed into tenant repository so it can be previewed immediately
    if (job.status === "succeeded" && job.finalSiteConfig) {
      const ownerUserId = `usr_owner_${siteId.slice(0, 8)}`;
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
