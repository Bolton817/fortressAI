import { NextRequest, NextResponse } from "next/server";
import { globalJobStore } from "@/ai/orchestrator/job-store";
import { getJobProgressView } from "@/ai/orchestrator/progress-reporter";

/**
 * Fortress AI — Generation Job Status API (TDD §27.3, FR-078)
 * Polling endpoint for durable background generation progress.
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = globalJobStore.getJob(jobId);

  if (!job) {
    return NextResponse.json(
      {
        error: {
          code: "JOB_NOT_FOUND",
          message: `Generation job '${jobId}' not found.`,
        },
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    jobId,
    status: job.status,
    progress: getJobProgressView(job),
    finalSiteConfig: job.finalSiteConfig,
  });
}
