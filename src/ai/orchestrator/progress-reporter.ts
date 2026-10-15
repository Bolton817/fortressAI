import { GenerationJobRecord, PipelineStageKey } from "./job-store";

/**
 * Fortress AI — Build Progress Reporter (TDD §11.1, FR-078)
 * Exposes stage-by-stage status that survives refresh and device change.
 * Invariant: Completed stages only shown after persisted completion.
 */

export interface ProgressStatusView {
  jobId: string;
  siteId: string;
  status: GenerationJobRecord["status"];
  currentStage: PipelineStageKey;
  progressPercent: number;
  stageTitle: string;
  stageDescription: string;
  completedStages: PipelineStageKey[];
  isComplete: boolean;
  hasFailed: boolean;
  error?: string;
  totalTokens: number;
  totalCostMinorUnits: number;
}

const STAGE_METADATA: Record<
  PipelineStageKey,
  { percent: number; title: string; description: string }
> = {
  INTAKE: {
    percent: 10,
    title: "Brief Normalisation",
    description: "Normalising business facts and building the verified provenance ledger.",
  },
  SITE_PLAN: {
    percent: 20,
    title: "Architecture Planning",
    description: "Resolving optimal theme, core routes, and conversion paths.",
  },
  HOME_PAGE: {
    percent: 35,
    title: "Homepage Drafting",
    description: "Writing high-converting value propositions and hero copy.",
  },
  ABOUT_PAGE: {
    percent: 45,
    title: "About Story",
    description: "Composing factual brand narrative and verified mission values.",
  },
  SERVICES_PAGE: {
    percent: 55,
    title: "Offerings Matrix",
    description: "Detailing specialized service offerings and client benefit cards.",
  },
  CONTACT_PAGE: {
    percent: 65,
    title: "Contact Configuration",
    description: "Configuring verified contact details and enquiry pathways.",
  },
  BLOG_DRAFTS: {
    percent: 80,
    title: "Editorial Starters",
    description: "Drafting 3 launch blog articles tailored to your industry.",
  },
  ASSET_RESOLUTION: {
    percent: 90,
    title: "Curated Media Matching",
    description: "Resolving licensed Cloudinary imagery with focal and ratio fit.",
  },
  FACTUALITY_GUARD: {
    percent: 95,
    title: "Factuality Verification",
    description: "Enforcing zero-testimonial invariant and auditing unsupplied claims.",
  },
  CANONICAL_ASSEMBLY: {
    percent: 100,
    title: "Canonical Assembly",
    description: "Validating final SiteConfiguration and preparing preview.",
  },
};

export function getJobProgressView(job: GenerationJobRecord): ProgressStatusView {
  const completedStages: PipelineStageKey[] = [];
  for (const [key, step] of Object.entries(job.steps) as [PipelineStageKey, any][]) {
    if (step.status === "succeeded") {
      completedStages.push(key);
    }
  }

  const meta = STAGE_METADATA[job.currentStage] || {
    percent: 0,
    title: "Initializing",
    description: "Preparing generation workflow...",
  };

  const isComplete = job.status === "succeeded";
  const hasFailed = job.status === "failed";
  const progressPercent = isComplete ? 100 : meta.percent;

  return {
    jobId: job.jobId,
    siteId: job.siteId,
    status: job.status,
    currentStage: job.currentStage,
    progressPercent,
    stageTitle: meta.title,
    stageDescription: meta.description,
    completedStages,
    isComplete,
    hasFailed,
    error: job.error,
    totalTokens: job.totalTokens,
    totalCostMinorUnits: job.totalCostMinorUnits,
  };
}
