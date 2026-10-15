import {
  AIProviderAdapter,
  GenerateStructuredParams,
  StructuredGenerationResult,
} from "./types";
import { parseAndValidate, buildRepairPrompt } from "./repair-engine";
import { SchemaValidationError } from "@/core/errors";

/**
 * Fortress AI — Google Gemini AI Provider Adapter (TDD §6, §11.1, FR-029)
 * Interacts with Google Gemini via REST API with JSON structured outputs.
 */

export class GeminiAIProvider implements AIProviderAdapter {
  readonly id = "gemini-provider";
  readonly name = "Google Gemini Provider";
  readonly defaultModel: string;
  private apiKey: string;

  constructor(apiKey?: string, model = "gemini-2.5-flash") {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || "";
    this.defaultModel = model;
  }

  async generateStructured<T>(
    params: GenerateStructuredParams<T>
  ): Promise<StructuredGenerationResult<T>> {
    if (!this.apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not configured in environment. Provide an API key or use MockAIProvider."
      );
    }

    const startTime = Date.now();
    const promptText = params.promptContract.renderPrompt(params.context);
    const systemInstruction =
      params.promptContract.systemInstruction ||
      "You are Fortress AI, an expert website copy and strategy engine. Return ONLY valid JSON adhering strictly to the requested schema. Never output markdown code fences, comments, or conversational text.";

    let currentPrompt = promptText;
    let repairAttempts = 0;
    let wasRepaired = false;
    let rawText = "";
    let lastError = "";
    let lastFieldErrors: Record<string, string[]> | undefined;

    // Loop for initial call + max 1 repair pass (TDD §11.1 Stage G, FR-029)
    for (let attempt = 0; attempt <= 1; attempt++) {
      const response = await this.callGeminiApi({
        systemInstruction,
        prompt: currentPrompt,
        temperature: params.temperature ?? 0.3,
        maxTokens: params.maxTokens ?? 2048,
      });

      rawText = response.text;
      const validation = parseAndValidate<T>(rawText, params.promptContract.schema);

      if (validation.success) {
        const durationMs = Date.now() - startTime;
        return {
          data: validation.data!,
          rawText,
          usage: {
            promptTokens: response.promptTokens,
            completionTokens: response.completionTokens,
            totalTokens: response.promptTokens + response.completionTokens,
            estimatedCostMinorUnits: Math.ceil(
              (response.promptTokens * 0.15 + response.completionTokens * 0.6) / 100
            ),
            durationMs,
          },
          provider: this.id,
          model: this.defaultModel,
          repaired: wasRepaired,
          repairAttemptCount: repairAttempts,
        };
      }

      // If validation failed and we still have a repair attempt left
      if (attempt === 0) {
        repairAttempts++;
        wasRepaired = true;
        lastError = validation.error || "Unknown validation error";
        lastFieldErrors = validation.fieldErrors;
        currentPrompt = `${promptText}\n\n${buildRepairPrompt(lastError, lastFieldErrors)}`;
      } else {
        lastError = validation.error || "Validation error after repair";
        lastFieldErrors = validation.fieldErrors;
      }
    }

    throw new SchemaValidationError(
      `Gemini output failed schema validation after bounded repair: ${lastError}`,
      lastFieldErrors
    );
  }

  private async callGeminiApi(params: {
    systemInstruction: string;
    prompt: string;
    temperature: number;
    maxTokens: number;
  }): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.defaultModel}:generateContent?key=${this.apiKey}`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: params.prompt }],
        },
      ],
      systemInstruction: {
        parts: [{ text: params.systemInstruction }],
      },
      generationConfig: {
        responseMimeType: "application/json",
        temperature: params.temperature,
        maxOutputTokens: params.maxTokens,
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const json = await response.json();
    const candidate = json.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || "";
    const promptTokens = json.usageMetadata?.promptTokenCount || Math.ceil(params.prompt.length / 4);
    const completionTokens = json.usageMetadata?.candidatesTokenCount || Math.ceil(text.length / 4);

    return { text, promptTokens, completionTokens };
  }
}
