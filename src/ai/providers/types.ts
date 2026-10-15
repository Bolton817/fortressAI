import { z } from "zod";

/**
 * Fortress AI — AI Provider Adapter & Prompt Contract Types (TDD §6, §11.4, §12.1, FR-029, FR-070)
 */

export interface AIUsageRecord {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostMinorUnits: number; // In cents / minor currency units
  durationMs: number;
}

export interface StructuredGenerationResult<T> {
  data: T;
  rawText: string;
  usage: AIUsageRecord;
  provider: string;
  model: string;
  repaired: boolean;
  repairAttemptCount: number;
}

export interface PromptContract<T = any> {
  id: string;
  version: string;
  stage: string;
  schema: z.ZodSchema<T>;
  systemInstruction?: string;
  renderPrompt: (context: any) => string;
}

export interface GenerateStructuredParams<T> {
  promptContract: PromptContract<T>;
  context: any;
  temperature?: number;
  maxTokens?: number;
  idempotencyKey: string;
}

export interface AIProviderAdapter {
  readonly id: string;
  readonly name: string;
  readonly defaultModel: string;
  generateStructured<T>(params: GenerateStructuredParams<T>): Promise<StructuredGenerationResult<T>>;
}
