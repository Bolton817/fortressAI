import { z } from "zod";
import { PromptContract } from "../providers/types";

/**
 * Fortress AI — Versioned Prompt Contract Factory (TDD §12.1, §40.3, FR-088)
 */

export function createPromptContract<T>(params: {
  id: string;
  version: string;
  stage: string;
  schema: z.ZodSchema<T>;
  systemInstruction?: string;
  renderPrompt: (context: any) => string;
}): PromptContract<T> {
  return {
    id: params.id,
    version: params.version,
    stage: params.stage,
    schema: params.schema,
    systemInstruction: params.systemInstruction,
    renderPrompt: params.renderPrompt,
  };
}
