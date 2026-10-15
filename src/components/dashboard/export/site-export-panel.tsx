"use client";

import React, { useState, useEffect } from "react";
import {
  Download,
  CheckCircle2,
  AlertTriangle,
  Info,
  Server,
  FileArchive,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { DependencyReport } from "@/core/export/types";

interface SiteExportPanelProps {
  siteId: string;
  siteName: string;
  platformSlug: string;
}

export function SiteExportPanel({ siteId, siteName, platformSlug }: SiteExportPanelProps) {
  const [report, setReport] = useState<DependencyReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{
    exportId: string;
    downloadUrl: string;
    expiresAt: string;
    sha256: string;
    sizeBytes: number;
    fileCount: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [activeHostTab, setActiveHostTab] = useState<"netlify" | "vercel" | "cloudflare" | "github" | "nginx">("netlify");

  useEffect(() => {
    fetchReport();
  }, [siteId]);

  async function fetchReport() {
    setLoadingReport(true);
    setError(null);
    try {
      const res = await fetch(`/api/export/${siteId}/report`);
      const data = await res.json();
      if (res.ok && data.success) {
        setReport(data.report);
      } else {
        setError(data.error?.message || "Failed to load compatibility report");
      }
    } catch {
      setError("Network error fetching compatibility report");
    } finally {
      setLoadingReport(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch(`/api/export/${siteId}`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setExportResult({
          exportId: data.exportId,
          downloadUrl: data.downloadUrl,
          expiresAt: data.expiresAt,
          sha256: data.sha256,
          sizeBytes: data.sizeBytes,
          fileCount: data.fileCount,
        });
      } else {
        setError(data.error?.message || "Failed to compile static export package");
      }
    } catch {
      setError("Network error initiating static export");
    } finally {
      setExporting(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              <Server className="w-3.5 h-3.5" />
              <span>Independent Static Hosting (TDD §21, FR-080)</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">
              Static Site Export & Data Portability
            </h2>
            <p className="text-sm text-zinc-600 max-w-2xl">
              Compile your website into an independent, zero-dependency HTML/CSS/JS package. Deploy it to Netlify, Vercel, Cloudflare Pages, GitHub Pages, or any static host without Fortress AI runtime dependencies.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              disabled={exporting || loadingReport}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {exporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Compiling Package...</span>
                </>
              ) : (
                <>
                  <FileArchive className="w-4 h-4" />
                  <span>Compile Static Package</span>
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold">Notice:</span>
              <p>{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Ready Download Card */}
      {exportResult && (
        <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/40 p-6 shadow-xs animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                <span>Static Package Ready for Download</span>
              </div>
              <h3 className="text-lg font-bold text-zinc-900">
                {platformSlug}-static-export.zip
              </h3>
              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-600">
                <span>Size: <strong className="text-zinc-900">{formatBytes(exportResult.sizeBytes)}</strong></span>
                <span>Routes: <strong className="text-zinc-900">{exportResult.fileCount} pages</strong></span>
                <span className="flex items-center gap-1.5">
                  SHA-256:{" "}
                  <code className="px-1.5 py-0.5 rounded bg-zinc-100 font-mono text-zinc-800 text-[11px]">
                    {exportResult.sha256.substring(0, 12)}...
                  </code>
                  <button
                    onClick={() => copyToClipboard(exportResult.sha256)}
                    className="text-zinc-500 hover:text-zinc-900 transition-colors"
                    title="Copy full SHA-256 hash"
                  >
                    {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={exportResult.downloadUrl}
                download
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Download ZIP Archive</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Flight Compatibility Matrix & Dependency Disclosure */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-900">
              Export Compatibility & Backend Dependency Report
            </h3>
            <p className="text-xs text-zinc-500">
              Discloses features requiring external services or configurations before static deployment (TDD §21.2, §40.6, FR-081).
            </p>
          </div>

          {report && (
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                {report.summary.supportedCount} Supported
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-medium border border-amber-200">
                {report.summary.externalRequiredCount} External Needed
              </span>
            </div>
          )}
        </div>

        {loadingReport ? (
          <div className="py-8 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-zinc-400" />
            <span>Analyzing site components and dependencies...</span>
          </div>
        ) : report ? (
          <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-xl overflow-hidden">
            {report.features.map((feat, idx) => (
              <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-900">{feat.feature}</span>
                    <span className="text-zinc-400 text-[11px]">• {feat.category}</span>
                  </div>
                  <p className="text-zinc-600 max-w-xl">{feat.action}</p>
                </div>

                <div className="shrink-0">
                  {feat.status === "supported" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Supported</span>
                    </span>
                  )}
                  {feat.status === "external-required" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      <AlertTriangle className="w-3 h-3" />
                      <span>External Required</span>
                    </span>
                  )}
                  {feat.status === "replaced" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      <Info className="w-3 h-3" />
                      <span>Host Replaced</span>
                    </span>
                  )}
                  {feat.status === "not-included" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                      <span>Not Included</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Host Deployment Instructions */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-zinc-900">
            One-Click Deployment Guides (Included Configs)
          </h3>
          <p className="text-xs text-zinc-500">
            Your static ZIP contains pre-built configuration files tailored for popular static hosts.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap gap-2 border-b border-zinc-100 pb-3">
          {(["netlify", "vercel", "cloudflare", "github", "nginx"] as const).map((host) => (
            <button
              key={host}
              onClick={() => setActiveHostTab(host)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                activeHostTab === host
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {host === "github" ? "GitHub Pages" : host === "cloudflare" ? "Cloudflare Pages" : host}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="text-xs text-zinc-600 space-y-3 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
          {activeHostTab === "netlify" && (
            <div className="space-y-2">
              <h4 className="font-bold text-zinc-900">Deploy to Netlify (Drag & Drop)</h4>
              <p>Your ZIP bundle contains pre-configured <code>_redirects</code> and <code>netlify.toml</code> files handling clean URLs and security headers.</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Extract your downloaded ZIP archive.</li>
                <li>Go to <a href="https://app.netlify.com/drop" target="_blank" rel="noopener" className="text-indigo-600 underline">Netlify Drop</a>.</li>
                <li>Drag the unzipped folder into the drop area. Your website is live in seconds.</li>
              </ol>
            </div>
          )}

          {activeHostTab === "vercel" && (
            <div className="space-y-2">
              <h4 className="font-bold text-zinc-900">Deploy to Vercel</h4>
              <p>Includes <code>vercel.json</code> with <code>cleanUrls: true</code>.</p>
              <pre className="p-3 bg-zinc-900 text-zinc-100 rounded-lg overflow-x-auto font-mono text-[11px]">
                cd {platformSlug}-static-export && vercel --prod
              </pre>
            </div>
          )}

          {activeHostTab === "cloudflare" && (
            <div className="space-y-2">
              <h4 className="font-bold text-zinc-900">Deploy to Cloudflare Pages</h4>
              <p>Includes <code>_headers</code> configuring HSTS, Content Security Policy, and asset caching.</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Log in to Cloudflare Dashboard &gt; Workers &amp; Pages.</li>
                <li>Create application &gt; Pages &gt; Upload assets.</li>
                <li>Select the exported folder and deploy.</li>
              </ol>
            </div>
          )}

          {activeHostTab === "github" && (
            <div className="space-y-2">
              <h4 className="font-bold text-zinc-900">Deploy to GitHub Pages</h4>
              <p>Includes a <code>.nojekyll</code> file preventing GitHub from ignoring stylesheets and clean routes.</p>
              <p>Push this folder to your repository&apos;s <code>gh-pages</code> branch or <code>/docs</code> directory.</p>
            </div>
          )}

          {activeHostTab === "nginx" && (
            <div className="space-y-2">
              <h4 className="font-bold text-zinc-900">Deploy to Nginx / Apache / S3</h4>
              <p>Includes <code>nginx.conf</code> server block snippet and <code>.htaccess</code> for Apache with clean URL rewrites.</p>
              <pre className="p-3 bg-zinc-900 text-zinc-100 rounded-lg overflow-x-auto font-mono text-[11px]">
                try_files $uri $uri.html $uri/ /index.html =404;
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
