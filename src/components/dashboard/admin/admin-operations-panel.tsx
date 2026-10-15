"use client";

import React, { useState, useEffect } from "react";

export interface AdminPanelProps {
  initialRole?: "admin" | "support";
}

export function AdminOperationsPanel({ initialRole = "admin" }: AdminPanelProps) {
  const [role, setRole] = useState<"admin" | "support">(initialRole);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async (activeRole: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/overview", {
        headers: { "x-user-role": activeRole },
      });
      if (!res.ok) {
        throw new Error(`Failed to load admin overview: ${res.statusText}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to fetch overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview(role);
  }, [role]);

  return (
    <div className="space-y-6">
      {/* Header & Role Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Operational Health & Admin Console
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time multi-tenant telemetry, subsystem health, and immutable audit logs (TDD §42.3, FR-087).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Simulated Role:</span>
          <button
            onClick={() => setRole("admin")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              role === "admin"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Admin (Full)
          </button>
          <button
            onClick={() => setRole("support")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              role === "support"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Support (Redacted)
          </button>
        </div>
      </div>

      {loading && (
        <div className="py-12 text-center text-sm text-slate-500 animate-pulse">
          Loading platform operational telemetry...
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm">
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="space-y-6">
          {/* Subsystem Health Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* AI Generation */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 uppercase">AI Pipeline</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                  {data.panels.generationHealth.successRate}% Success
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {data.panels.generationHealth.totalGenerations} Jobs
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {data.panels.generationHealth.creditsDebited} credits debited • {data.panels.generationHealth.avgDurationMs}ms avg
              </p>
            </div>

            {/* Publishing */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 uppercase">Publishing</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                  {data.panels.publishingHealth.successRate}% Success
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {data.panels.publishingHealth.publishedReleases} Releases
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {data.panels.publishingHealth.rollbacksExecuted} rollbacks executed
              </p>
            </div>

            {/* Domains */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 uppercase">Domains</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400">
                  Live
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {data.panels.domainOperations.registrations} Registered
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {data.panels.domainOperations.verifications} verified • {data.panels.domainOperations.renewals} renewed
              </p>
            </div>

            {/* Latency & Errors */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 uppercase">System Latency</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  p95: {data.panels.systemLatency.p95Ms}ms
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {data.panels.systemLatency.errorRate}% Errors
              </div>
              <p className="text-xs text-slate-500 mt-1">
                p50: {data.panels.systemLatency.p50Ms}ms • p99: {data.panels.systemLatency.p99Ms}ms
              </p>
            </div>
          </div>

          {/* Audit Trail Panel */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Recent Privileged Audit Events (Append-Only)
                </h3>
                <p className="text-xs text-slate-500">
                  Chronological security and lifecycle log (FR-086).
                </p>
              </div>
              <span className="text-xs font-mono px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Viewer: {role.toUpperCase()}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="pb-2 font-medium">Timestamp</th>
                    <th className="pb-2 font-medium">Action</th>
                    <th className="pb-2 font-medium">Actor</th>
                    <th className="pb-2 font-medium">Target</th>
                    <th className="pb-2 font-medium">Outcome</th>
                    <th className="pb-2 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {data.panels.recentAuditLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 text-slate-500">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 font-semibold text-slate-900 dark:text-slate-200">
                        {log.action}
                      </td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-400">
                        {log.actorUserId || "system"}
                      </td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-400">
                        {log.targetType}:{log.targetId.slice(0, 12)}...
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            log.outcome === "success"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                        >
                          {log.outcome || "success"}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500 italic max-w-xs truncate">
                        {log.reason || "—"}
                      </td>
                    </tr>
                  ))}
                  {data.panels.recentAuditLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-400">
                        No audit events recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
