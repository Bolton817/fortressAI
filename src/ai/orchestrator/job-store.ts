import { randomUUID } from "node:crypto";

/**
 * Fortress AI — Durable Generation Job Store & Ledger (TDD §11.3, §28.1, FR-026, FR-076)
 * Invariant: Completed stages are persisted independently so worker restarts or
 * downstream failures resume without rebuilding successful stages.
 */

export type JobState =
  | "queued"
  | "running"
  | "retry_wait"
  | "succeeded"
  | "failed"
  | "cancelled";

export type PipelineStageKey =
  | "INTAKE"
  | "SITE_PLAN"
  | "HOME_PAGE"
  | "ABOUT_PAGE"
  | "SERVICES_PAGE"
  | "CONTACT_PAGE"
  | "BLOG_DRAFTS"
  | "ASSET_RESOLUTION"
  | "FACTUALITY_GUARD"
  | "CANONICAL_ASSEMBLY";

export interface StageStepRecord {
  stepKey: PipelineStageKey;
  status: "pending" | "running" | "succeeded" | "failed" | "skipped";
  output?: any;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  retryCount: number;
}

export interface GenerationJobRecord {
  jobId: string;
  siteId: string;
  platformSlug: string;
  status: JobState;
  currentStage: PipelineStageKey;
  steps: Record<PipelineStageKey, StageStepRecord>;
  rawInput: any;
  finalSiteConfig?: any;
  error?: string;
  totalTokens: number;
  totalCostMinorUnits: number;
  createdAt: string;
  updatedAt: string;
}

const ALL_STAGES: PipelineStageKey[] = [
  "INTAKE",
  "SITE_PLAN",
  "HOME_PAGE",
  "ABOUT_PAGE",
  "SERVICES_PAGE",
  "CONTACT_PAGE",
  "BLOG_DRAFTS",
  "ASSET_RESOLUTION",
  "FACTUALITY_GUARD",
  "CANONICAL_ASSEMBLY",
];

export class DurableJobStore {
  private jobs: Map<string, GenerationJobRecord> = new Map();

  createJob(params: {
    siteId: string;
    platformSlug: string;
    rawInput: any;
  }): GenerationJobRecord {
    const jobId = randomUUID();
    const now = new Date().toISOString();

    const steps: Record<PipelineStageKey, StageStepRecord> = {} as any;
    for (const stage of ALL_STAGES) {
      steps[stage] = {
        stepKey: stage,
        status: "pending",
        retryCount: 0,
      };
    }

    const job: GenerationJobRecord = {
      jobId,
      siteId: params.siteId,
      platformSlug: params.platformSlug,
      status: "queued",
      currentStage: "INTAKE",
      steps,
      rawInput: params.rawInput,
      totalTokens: 0,
      totalCostMinorUnits: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.set(jobId, job);
    return job;
  }

  getJob(jobId: string): GenerationJobRecord | undefined {
    return this.jobs.get(jobId);
  }

  getJobsBySite(siteId: string): GenerationJobRecord[] {
    return Array.from(this.jobs.values()).filter((j) => j.siteId === siteId);
  }

  updateStageStatus(
    jobId: string,
    stage: PipelineStageKey,
    status: StageStepRecord["status"],
    output?: any,
    error?: string
  ): GenerationJobRecord {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    const step = job.steps[stage];
    step.status = status;
    step.output = output !== undefined ? output : step.output;
    step.error = error;
    if (status === "running" && !step.startedAt) step.startedAt = new Date().toISOString();
    if (status === "succeeded" || status === "failed") step.completedAt = new Date().toISOString();
    if (status === "failed") step.retryCount += 1;

    job.currentStage = stage;
    job.updatedAt = new Date().toISOString();

    return job;
  }

  setJobStatus(
    jobId: string,
    status: JobState,
    finalSiteConfig?: any,
    error?: string
  ): GenerationJobRecord {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    job.status = status;
    if (finalSiteConfig) job.finalSiteConfig = finalSiteConfig;
    if (error) job.error = error;
    job.updatedAt = new Date().toISOString();

    return job;
  }

  recordStageUsage(jobId: string, tokens: number, costMinorUnits: number) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.totalTokens += tokens;
      job.totalCostMinorUnits += costMinorUnits;
      job.updatedAt = new Date().toISOString();
    }
  }

  clear() {
    this.jobs.clear();
  }
}

export const globalJobStore = new DurableJobStore();
