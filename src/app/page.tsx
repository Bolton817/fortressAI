import Link from "next/link";
import { ExternalLink, Layers, ShieldCheck, Download, Code, Sparkles } from "lucide-react";
import { SITE_A_ID, SITE_B_ID, maraHorizonConfig, nairobiAdvisoryConfig } from "@/db/seed-data";
import { sectionRegistry } from "@/registry";

export default function Home() {
  const manifests = sectionRegistry.listManifests();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <header className="border-b border-slate-200 pb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Phase 0 Milestone: Architecture Proof (Walking Skeleton)
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Fortress AI Platform
            </h1>
            <p className="text-slate-600 mt-2 max-w-2xl">
              Verification harness for the core invariant: <em>Canonical website is structured configuration plus versioned content and assets. A shared renderer serves managed sites; a separate export pipeline compiles that same configuration into portable static files.</em>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 bg-slate-200 text-slate-700 font-mono rounded">TDD v1.0 Compliant</span>
          </div>
        </header>

        {/* Verification Proof Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Tenant A Shared Renderer */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded">
                  Tenant A (Tourism)
                </span>
                <span className="text-xs text-slate-500 font-mono">Warm Editorial Theme</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {maraHorizonConfig.businessProfile.name}
              </h2>
              <p className="text-sm text-slate-600">
                Rendered dynamically via the shared multi-tenant engine using canonical config, CSS variable tokens, GSAP presets, and licensed media bindings.
              </p>
              <div className="text-xs text-slate-500 space-y-1 bg-slate-50 p-3 rounded font-mono">
                <div>Slug: /{maraHorizonConfig.platformSlug}</div>
                <div>ID: {SITE_A_ID}</div>
                <div>Sections: 5 (Header, Hero, Services, About, Footer)</div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between gap-3">
              <Link
                href={`/preview/${SITE_A_ID}`}
                target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
              >
                <span>Launch Live Preview</span>
                <ExternalLink className="w-4 h-4" />
              </Link>
              <Link
                href={`/api/export/${SITE_A_ID}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Static Export JSON</span>
              </Link>
            </div>
          </div>

          {/* Card 2: Tenant B Shared Renderer */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded">
                  Tenant B (Advisory)
                </span>
                <span className="text-xs text-slate-500 font-mono">Modern Slate Theme</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {nairobiAdvisoryConfig.businessProfile.name}
              </h2>
              <p className="text-sm text-slate-600">
                A second completely isolated tenant proving independent typography, colors, layout rules, and zero cross-tenant state leakage.
              </p>
              <div className="text-xs text-slate-500 space-y-1 bg-slate-50 p-3 rounded font-mono">
                <div>Slug: /{nairobiAdvisoryConfig.platformSlug}</div>
                <div>ID: {SITE_B_ID}</div>
                <div>Sections: 3 (Header, Hero, Footer)</div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between gap-3">
              <Link
                href={`/preview/${SITE_B_ID}`}
                target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
              >
                <span>Launch Live Preview</span>
                <ExternalLink className="w-4 h-4" />
              </Link>
              <Link
                href={`/api/export/${SITE_B_ID}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Static Export JSON</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Section Registry Overview */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-slate-900">Section Manifest Registry (TDD §9)</h3>
            </div>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
              {manifests.length} Released Manifests
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Section ID</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Layout Type</th>
                  <th className="py-3 px-4">Page Types</th>
                  <th className="py-3 px-4">Media Slots</th>
                  <th className="py-3 px-4">Motion Presets</th>
                  <th className="py-3 px-4">Static Safe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {manifests.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900">{m.id}</td>
                    <td className="py-3 px-4">{m.version}</td>
                    <td className="py-3 px-4 text-slate-600">{m.layoutType}</td>
                    <td className="py-3 px-4 text-slate-600">{m.pageTypes.join(", ")}</td>
                    <td className="py-3 px-4 text-slate-600">{m.mediaSlots.length}</td>
                    <td className="py-3 px-4 text-slate-600">{m.animationPresets.join(", ") || "none"}</td>
                    <td className="py-3 px-4">
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-sans font-medium text-[11px]">
                        ✓ {m.export.staticSafe ? "Yes" : "No"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Invariant & Architecture Guarantee Footnote */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div className="bg-slate-100 rounded-lg p-5 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Tenant Isolation (ADR-001)</span>
            </div>
            <p className="text-xs text-slate-600">
              Every data access call requires explicit tenant context. Tenant A cannot query, mutate, or leak Tenant B configuration.
            </p>
          </div>

          <div className="bg-slate-100 rounded-lg p-5 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <Code className="w-4 h-4 text-blue-600" />
              <span>Schema Enforced (ADR-003)</span>
            </div>
            <p className="text-xs text-slate-600">
              No arbitrary HTML or React code from AI. Every field, length limit, and array count is verified by runtime Zod validators.
            </p>
          </div>

          <div className="bg-slate-100 rounded-lg p-5 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Reduced-Motion Safe (TDD §18)</span>
            </div>
            <p className="text-xs text-slate-600">
              GSAP animations automatically defer to static display when prefers-reduced-motion is detected, ensuring WCAG 2.2 AA compliance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
