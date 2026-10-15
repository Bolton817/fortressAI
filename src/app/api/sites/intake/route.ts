import { NextRequest, NextResponse } from "next/server";
import { normalizeBusinessBrief } from "@/ai/intake/brief-normaliser";
import { evaluateBriefCompleteness } from "@/ai/intake/follow-up-engine";
import { randomUUID } from "node:crypto";

/**
 * Fortress AI — Intake & Brief API (TDD §11.1 Stage A, FR-015, FR-016)
 * Validates raw brief, checks completeness, and returns follow-ups if needed.
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const siteId = body.siteId || randomUUID();
    const rawInput = body.brief || body;

    const completeness = evaluateBriefCompleteness(rawInput);
    const normalized = normalizeBusinessBrief(siteId, rawInput);

    return NextResponse.json({
      siteId,
      brief: normalized,
      completeness,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: {
          code: "INTAKE_VALIDATION_FAILED",
          message: err.message || "Failed to process business intake brief",
          fieldErrors: err.fieldErrors,
        },
      },
      { status: 400 }
    );
  }
}
