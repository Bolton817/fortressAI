import { z } from "zod";

/**
 * Fortress AI — Structured Output Parser & Bounded Repair Engine (TDD §11.1 Stage G, FR-029)
 * Invariant: Retries are strictly bounded (max 1 repair attempt). Model output
 * never bypasses server-side Zod validation.
 */

export interface ParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export function extractJsonFromText(rawText: string): any {
  let cleaned = rawText.trim();
  // Strip markdown code fences if model returned ```json ... ```
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  }
  return JSON.parse(cleaned);
}

export function parseAndValidate<T>(rawText: string, schema: z.ZodSchema<T>): ParseResult<T> {
  let json: any;
  try {
    json = extractJsonFromText(rawText);
  } catch (err: any) {
    return {
      success: false,
      error: `Malformed JSON: ${err.message}`,
    };
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    return {
      success: false,
      error: "Schema validation failed",
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

export function buildRepairPrompt(error: string, fieldErrors?: Record<string, string[]>): string {
  let message = `CRITICAL ERROR: Your previous response was invalid.\nError: ${error}\n`;
  if (fieldErrors && Object.keys(fieldErrors).length > 0) {
    message += `Field-level issues:\n${JSON.stringify(fieldErrors, null, 2)}\n`;
  }
  message += `\nPlease correct the output. Return ONLY the valid JSON object matching the required schema. Do not include markdown fences, comments, or explanations.`;
  return message;
}
