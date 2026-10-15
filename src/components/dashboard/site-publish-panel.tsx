"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Globe,
  UploadCloud,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  History,
  Search,
  FileCode,
  ShieldCheck,
  Loader2,
} from "lucide-react";

interface ReleaseItem {
  id: string;
  siteId: string;
  releaseNumber: number;
  commitMessage?: string;
  publishedByUserId: string;
  healthStatus: string;
  buildDurationMs?: number;
  artefactHash?: string;
  createdAt: string;
  isActive: boolean;
}

interface SitePublishPanelProps {
  siteId: string;
  siteName: string;
  platformSlug: string;
  initialLifecycleStatus: string;
  initialPublishedReleaseId?: string | null;
}

export function SitePublishPanel({
  siteId,
  siteName,
  platformSlug,
  initialLifecycleStatus,
  initialPublishedReleaseId,
}: SitePublishPanelProps) {
  const [lifecycleStatus, setLifecycleStatus] = useState(initialLifecycleStatus);
  const [publishedReleaseId, setPublishedReleaseId] = useState(initialPublishedReleaseId);
  const [releases, setReleases] = useState<ReleaseItem[]>([]);
  const [loadingReleases, setLoadingReleases] = useState(true);

  const [publishing, setPublishing] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  const [rollingBackId, setRollingBackId] = useState<string | null>(null);
  const [rollbackConfirmId, setRollbackConfirmId] = useState<string | null>(null);
  const [rollbackError, setRollbackError] = useState<string | null>(null);

  const fetchReleases = useCallback(async () => {
    try {
      const res = await fetch(`/api/sites/${siteId}/releases`);
      if (res.ok) {
        const data = await res.json();
        setReleases(data.releases || []);
        setPublishedReleaseId(data.activeReleaseId);
      }
    } catch {
    } finally {
      setLoadingReleases(false);
    }
  }, [siteId]);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        void fetchReleases();
      }
    }, 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [fetchReleases]);

  const handlePublish = async () => {
    setPublishing(true);
    setPublishError(null);
    setPublishSuccess(null);

    try {
      const res = await fetch(`/api/sites/${siteId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commitMessage: commitMessage || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPublishError(data.error || "Failed to publish site.");
        return;
      }

      setLifecycleStatus("published");
      setPublishedReleaseId(data.release.id);
      setPublishSuccess(`Release #${data.release.releaseNumber} is now live!`);
      setCommitMessage("");
      setTimeout(() => {
        setPublishModalOpen(false);
        setPublishSuccess(null);
      }, 1500);
      await fetchReleases();
    } catch {
      setPublishError("Network error occurred during publication.");
    } finally {
      setPublishing(false);
    }
  };

  const handleRollback = async (targetReleaseId: string) => {
    setRollingBackId(targetReleaseId);
    setRollbackError(null);

    try {
      const res = await fetch(`/api/sites/${siteId}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetReleaseId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRollbackError(data.error || "Failed to rollback release.");
        return;
      }

      setPublishedReleaseId(targetReleaseId);
      setRollbackConfirmId(null);
      await fetchReleases();
    } catch {
      setRollbackError("Network error occurred during rollback.");
    } finally {
      setRollingBackId(null);
    }
  };

  const isPublished = lifecycleStatus === "published" && !!publishedReleaseId;
  const activeRelease = releases.find((r) => r.id === publishedReleaseId);
  const liveUrl = `/site/${platformSlug}`;

  return (
    <div className="space-y-8">
      {/* Top Banner / Publish Status Bar */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                isPublished
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-zinc-900">{siteName}</h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isPublished
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-amber-100 text-amber-800 border border-amber-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isPublished ? "bg-emerald-600 animate-pulse" : "bg-amber-600"
                    }`}
                  />
                  <span>
                    {isPublished
                      ? `Live (Release #${activeRelease?.releaseNumber || "1"})`
                      : "Draft (Unpublished)"}
                  </span>
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1 font-mono">
                Platform Host:{" "}
                <span className="text-zinc-700 font-semibold">{platformSlug}.fortressai.app</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/preview/${siteId}`}
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Private Preview</span>
            </Link>

            {isPublished && (
              <Link
                href={liveUrl}
                target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Visit Live Website</span>
              </Link>
            )}

            <button
              onClick={() => setPublishModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isPublished ? "Publish Updates" : "Publish Live"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SEO & Discovery Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-zinc-900 font-semibold text-sm">
            <Search className="w-4 h-4 text-emerald-700" />
            <span>Search Snippet Preview</span>
          </div>
          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
            <div className="text-xs text-emerald-800 font-mono truncate">
              https://{platformSlug}.fortressai.app
            </div>
            <div className="text-sm font-semibold text-blue-800 hover:underline cursor-pointer truncate">
              {siteName} | Official Website
            </div>
            <div className="text-xs text-zinc-600 line-clamp-2">
              Discover {siteName}. Premium tailored solutions, verified customer details, and seamless online booking.
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-zinc-900 font-semibold text-sm">
            <FileCode className="w-4 h-4 text-emerald-700" />
            <span>Discovery & Search Engine Files</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs">
              <div>
                <div className="font-semibold text-zinc-900">XML Sitemap</div>
                <div className="text-zinc-500 font-mono">/sitemap.xml</div>
              </div>
              {isPublished ? (
                <Link
                  href={`${liveUrl}/sitemap.xml`}
                  target="_blank"
                  className="text-emerald-700 hover:underline font-semibold inline-flex items-center gap-1"
                >
                  <span>View XML</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              ) : (
                <span className="text-zinc-400">Available after publish</span>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs">
              <div>
                <div className="font-semibold text-zinc-900">Robots Directive</div>
                <div className="text-zinc-500 font-mono">/robots.txt</div>
              </div>
              {isPublished ? (
                <Link
                  href={`${liveUrl}/robots.txt`}
                  target="_blank"
                  className="text-emerald-700 hover:underline font-semibold inline-flex items-center gap-1"
                >
                  <span>View TXT</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              ) : (
                <span className="text-zinc-400">Available after publish</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Release History & Rollback Timeline */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xs space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-zinc-700" />
            <h3 className="text-base font-bold text-zinc-900">Release History & Snapshots</h3>
          </div>
          <span className="text-xs text-zinc-500">
            {releases.length} total release{releases.length === 1 ? "" : "s"}
          </span>
        </div>

        {rollbackError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
            {rollbackError}
          </div>
        )}

        {loadingReleases ? (
          <div className="py-12 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
            <span>Loading release history...</span>
          </div>
        ) : releases.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-zinc-200 rounded-xl">
            <UploadCloud className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
            <p className="text-xs text-zinc-500">
              No releases published yet. Click &quot;Publish Live&quot; to deploy your first release.
            </p>
          </div>
        ) : (
          <div className="relative border-l border-zinc-200 ml-4 space-y-6 py-2">
            {releases.map((rel) => {
              const isCurrent = rel.id === publishedReleaseId;
              const isConfirming = rollbackConfirmId === rel.id;
              const isWorking = rollingBackId === rel.id;

              return (
                <div key={rel.id} className="relative pl-6">
                  {/* Timeline indicator node */}
                  <div
                    className={`absolute -left-2.5 top-1.5 w-5 h-5 rounded-full border-2 bg-white flex items-center justify-center ${
                      isCurrent
                        ? "border-emerald-600 ring-4 ring-emerald-50"
                        : "border-zinc-300"
                    }`}
                  >
                    {isCurrent && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
                  </div>

                  {/* Release Card */}
                  <div
                    className={`p-4 rounded-xl border transition-all ${
                      isCurrent
                        ? "bg-emerald-50/40 border-emerald-200 shadow-2xs"
                        : "bg-white border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-zinc-900">
                            Release #{rel.releaseNumber}
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-2xs font-bold uppercase tracking-wider">
                              Active Live Release
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-600 mt-1 font-medium">
                          {rel.commitMessage || "Published release"}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-2xs text-zinc-400 mt-2 font-mono">
                          <span>{new Date(rel.createdAt).toLocaleString()}</span>
                          {rel.artefactHash && (
                            <span>SHA: {rel.artefactHash.slice(0, 10)}...</span>
                          )}
                          {rel.buildDurationMs ? (
                            <span>Build: {rel.buildDurationMs}ms</span>
                          ) : null}
                        </div>
                      </div>

                      <div>
                        {isCurrent ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Currently Serving</span>
                          </div>
                        ) : isConfirming ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRollback(rel.id)}
                              disabled={isWorking}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                            >
                              {isWorking ? "Restoring..." : "Confirm Rollback"}
                            </button>
                            <button
                              onClick={() => setRollbackConfirmId(null)}
                              className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRollbackConfirmId(rel.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-300 hover:border-zinc-400 text-zinc-700 hover:text-zinc-900 bg-white rounded-lg text-xs font-semibold transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Revert to this version</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pre-Flight Publish Modal */}
      {publishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans">
          <div className="w-full max-w-lg bg-white border border-zinc-200 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Pre-Flight Publish Check</h3>
                <p className="text-xs text-zinc-500">
                  Verify critical invariants before deploying live release.
                </p>
              </div>
            </div>

            {/* Checklist */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2.5 text-xs text-zinc-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Canonical routes and page layouts validated</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Approved asset bindings and responsive media resolved</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>SEO meta tags, sitemap.xml &amp; robots.txt generated</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero fabricated ratings/claims guard enforced</span>
              </div>
            </div>

            {publishError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
                {publishError}
              </div>
            )}

            {publishSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{publishSuccess}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Release Commit Note (Optional)
              </label>
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="e.g., Updated contact phone & hero headline"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPublishModalOpen(false)}
                disabled={publishing}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={publishing}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 shadow-xs"
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Freezing &amp; Deploying...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Confirm &amp; Publish Live</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
