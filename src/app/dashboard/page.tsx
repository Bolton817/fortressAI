import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { getCurrentUser } from "@/core/auth/auth-guard";
import { tenantRepository } from "@/db/tenant-repository";
import { notificationRepository } from "@/db/notification-repository";
import { Sparkles, Globe, ArrowRight, ExternalLink, PlusCircle, CheckCircle2, Clock } from "lucide-react";

export default async function DashboardHomePage() {
  const reqHeaders = await headers();
  const cookie = reqHeaders.get("cookie") || "";
  const dummyReq = new Request("http://localhost", { headers: { cookie } });
  const user = await getCurrentUser(dummyReq);

  // If user is authenticated, load user's sites; otherwise fallback to sample demo sites
  const userId = user ? user.id : "usr_tenant_a_tourism";
  const sites = await tenantRepository.listSitesForUser(userId);
  const unreadCount = user ? notificationRepository.countUnreadForUser(user.id) : 0;

  return (
    <div className="space-y-8">
      {/* Welcome Banner & Primary Build Action (FR-011) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-zinc-900 p-6 sm:p-8 text-white shadow-md">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium mb-4 border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Website Generation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            Welcome back, {user?.displayName || "Founder"}
          </h1>
          <p className="text-sm text-zinc-300 mb-6 leading-relaxed">
            Generate production-ready multi-page websites with deterministic design systems, WCAG 2.2 AA compliance, and zero fabricated testimonials.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/build"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-all shadow-sm hover:shadow-emerald-500/25"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Build New Website</span>
            </Link>
            <Link
              href="/dashboard/websites"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-colors backdrop-blur-xs border border-white/10"
            >
              <span>Manage Websites ({sites.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Decorative background grid pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15)_0,transparent_70%)] pointer-events-none" />
      </div>

      {/* Overview Stats Cards (FR-011) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-white border border-zinc-200 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Active Websites</span>
            <Globe className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-zinc-900">{sites.length}</div>
          <p className="text-xs text-zinc-500 mt-1">Multi-page web applications</p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-zinc-200 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">System Status</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">Healthy</div>
          <p className="text-xs text-zinc-500 mt-1">Pipeline engine active</p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-zinc-200 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Unread Alerts</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-zinc-900">{unreadCount}</div>
          <p className="text-xs text-zinc-500 mt-1">Notifications in inbox</p>
        </div>
      </div>

      {/* Owned Websites Grid (FR-011, FR-014) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Your Websites</h2>
            <p className="text-xs text-zinc-500">Websites deployed or in draft revision</p>
          </div>
          <Link
            href="/dashboard/websites"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {sites.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white border border-dashed border-zinc-300">
            <Globe className="w-10 h-10 mx-auto text-zinc-400 mb-3 stroke-1" />
            <h3 className="text-sm font-semibold text-zinc-900 mb-1">No websites created yet</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-4">
              Start by building your first multi-page business website using the intake wizard.
            </p>
            <Link
              href="/build"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Launch Builder</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sites.map((site) => (
              <div
                key={site.id}
                className="flex flex-col justify-between p-5 rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 transition-all shadow-2xs hover:shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-zinc-900 truncate text-base">{site.name}</h3>
                      <p className="text-xs text-zinc-500 font-mono mt-0.5 truncate">
                        {site.platformSlug}.fortress.ai
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        site.lifecycleStatus === "published"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                      }`}
                    >
                      {site.lifecycleStatus}
                    </span>
                  </div>

                  <div className="text-xs text-zinc-500 space-y-1 mb-5">
                    <div className="flex items-center justify-between">
                      <span>Site ID:</span>
                      <span className="font-mono text-zinc-600 text-[11px] truncate max-w-[120px]">
                        {site.id}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Multi-Page:</span>
                      <span className="font-medium text-zinc-700">5 Pages + 3 Blog Drafts</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-100 flex items-center justify-between gap-2">
                  <Link
                    href={`/preview/${site.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-medium text-xs transition-colors"
                  >
                    <span>Preview</span>
                    <ExternalLink className="w-3 h-3 text-zinc-500" />
                  </Link>

                  <Link
                    href={`/build?siteId=${site.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs transition-colors"
                  >
                    <span>Edit</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
