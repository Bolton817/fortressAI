"use client";

import React from "react";
import Link from "next/link";
import { ProgressStatusView } from "@/ai/orchestrator/progress-reporter";

interface GenerationProgressProps {
  progress: ProgressStatusView;
  onResume?: () => void;
}

const STAGES = [
  { key: "INTAKE", label: "Brief Normalisation" },
  { key: "SITE_PLAN", label: "Architecture & Theme" },
  { key: "HOME_PAGE", label: "Homepage Copy" },
  { key: "ABOUT_PAGE", label: "About & Mission" },
  { key: "SERVICES_PAGE", label: "Offerings Matrix" },
  { key: "CONTACT_PAGE", label: "Contact Details" },
  { key: "BLOG_DRAFTS", label: "3 Launch Blog Drafts" },
  { key: "ASSET_RESOLUTION", label: "Curated Media" },
  { key: "FACTUALITY_GUARD", label: "Factuality Check" },
  { key: "CANONICAL_ASSEMBLY", label: "Canonical Assembly" },
];

export function GenerationProgress({ progress, onResume }: GenerationProgressProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-slate-100 gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider bg-indigo-50 text-indigo-700">
            Durable Pipeline Active
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-2">{progress.stageTitle}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{progress.stageDescription}</p>
        </div>

        <div className="text-right">
          <div className="text-3xl font-extrabold text-indigo-600">
            {progress.progressPercent}%
          </div>
          <div className="text-xs text-slate-400 mt-1 font-mono">
            {progress.totalTokens.toLocaleString()} tokens | ${(progress.totalCostMinorUnits / 100).toFixed(4)}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-3 mb-8 overflow-hidden">
        <div
          className="bg-indigo-600 h-3 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress.progressPercent}%` }}
        />
      </div>

      {/* Step Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        {STAGES.map((s, idx) => {
          const isDone = progress.completedStages.includes(s.key as any);
          const isCurrent = progress.currentStage === s.key && !progress.isComplete && !progress.hasFailed;

          return (
            <div
              key={s.key}
              className={`flex items-center gap-3 p-3 rounded-lg border text-sm transition ${
                isDone
                  ? "bg-emerald-50/50 border-emerald-200 text-emerald-900"
                  : isCurrent
                  ? "bg-indigo-50/70 border-indigo-300 text-indigo-900 font-medium"
                  : "bg-slate-50 border-slate-100 text-slate-400"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  isDone
                    ? "bg-emerald-600 text-white"
                    : isCurrent
                    ? "bg-indigo-600 text-white animate-pulse"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {isDone ? "✓" : idx + 1}
              </div>
              <span className="truncate">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Error state */}
      {progress.hasFailed && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <div className="font-bold">Stage Failure:</div>
          <p className="mt-1 font-mono text-xs">{progress.error || "Unknown stage error"}</p>
          {onResume && (
            <button
              onClick={onResume}
              className="mt-3 px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium text-xs shadow-sm transition"
            >
              Resume Pipeline from Checkpoint (FR-076)
            </button>
          )}
        </div>
      )}

      {/* Success State & Next Actions */}
      {progress.isComplete && (
        <div className="p-6 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-emerald-950">
                Site Plan & Canonical Generation Succeeded
              </h3>
              <p className="text-xs text-emerald-700 mt-1">
                Zero synthetic testimonials invariant verified. 5 core pages + 3 blog drafts assembled.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/preview/${progress.siteId}`}
                target="_blank"
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow transition"
              >
                Open Live Preview ↗
              </Link>
              <Link
                href={`/api/export/${progress.siteId}`}
                target="_blank"
                className="px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-sm shadow-sm transition"
              >
                Download Static Export
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
