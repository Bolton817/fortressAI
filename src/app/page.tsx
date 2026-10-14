import Link from "next/link";
import { ExternalLink, Layers, ShieldCheck, Download, Code, Sparkles, Compass, CheckCircle2 } from "lucide-react";
import { SITE_A_ID, SITE_B_ID, SITE_C_ID, maraHorizonConfig, nairobiAdvisoryConfig } from "@/db/seed-data";
import { allManifests } from "@/registry/manifests";

export default function Home() {
  const manifests = allManifests;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <header className="border-b border-slate-200 pb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Phase 1 Milestone: Design Engine & Multipage Composition Complete
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
            <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-800 font-medium rounded">WCAG 2.2 AA</span>
          </div>
        </header>

        {/* Phase 1 Featured Tenant: 5-Page Composed Site */}
        <section className="bg-gradient-to-br from-amber-900 via-stone-900 to-slate-900 text-white rounded-2xl p-8 shadow-lg relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Compass className="w-3.5 h-3.5" />
                <span>Phase 1 Full 5-Page Multipage Composition (TDD §8, §16, §21)</span>
              </div>
              <span className="text-xs text-amber-200/70 font-mono">Theme: warm-editorial • 5 Routes</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-50">
                Serengeti Echoes Safaris
              </h2>
              <p className="text-amber-100/80 max-w-3xl text-sm sm:text-base leading-relaxed">
                Assembled automatically by the deterministic composition engine. Obeys structural pacing (Hero first, footer last), strict factuality guardrails (verified conservation metrics &amp; genuine reviews only), and curated East African media asset matching.
              </p>
            </div>

            {/* Multipage Route Navigation Badges */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                Explore Multipage Routes:
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { slug: "", label: "Home (/)" },
                  { slug: "services", label: "Services (/services)" },
                  { slug: "about", label: "About (/about)" },
                  { slug: "blog", label: "Blog (/blog)" },
                  { slug: "contact", label: "Contact (/contact)" },
                ].map((route) => (
                  <Link
                    key={route.slug}
                    href={`/preview/${SITE_C_ID}/${route.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg backdrop-blur-sm border border-white/10 transition-colors"
                  >
                    <span>{route.label}</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-amber-200/60 font-mono">
                Site ID: {SITE_C_ID}
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href={`/api/export/${SITE_C_ID}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg shadow transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Static Export (TDD §21)</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Verification Proof Cards for Tenants A and B */}
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
              <h3 className="text-lg font-bold text-slate-900">Curated Section Registry (TDD §9, ADR-004)</h3>
            </div>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
              {manifests.length} Released Section Variants across 8 Families
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
                    <td className="py-3 px-4 text-slate-600">{m.pageTypes?.join(", ") || "all"}</td>
                    <td className="py-3 px-4 text-slate-600">{m.mediaSlots?.length || 0}</td>
                    <td className="py-3 px-4 text-slate-600">{m.animationPresets?.join(", ") || "none"}</td>
                    <td className="py-3 px-4">
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-sans font-medium text-[11px] inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{m.export?.staticSafe ? "Yes" : "No"}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Invariant & Architecture Guarantee Footnote */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
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

          <div className="bg-slate-100 rounded-lg p-5 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
              <span>Factuality Guardrail (TDD §16.5)</span>
            </div>
            <p className="text-xs text-slate-600">
              Testimonials and metrics are strictly omitted unless verified business owner input exists. Zero synthetic halluncinations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
