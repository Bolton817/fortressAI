import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { getCurrentUser } from "@/core/auth/auth-guard";
import { tenantRepository } from "@/db/tenant-repository";
import { PlusCircle, Globe, ExternalLink, Sparkles } from "lucide-react";

export default async function WebsitesManagementPage() {
  const reqHeaders = await headers();
  const cookie = reqHeaders.get("cookie") || "";
  const dummyReq = new Request("http://localhost", { headers: { cookie } });
  const user = await getCurrentUser(dummyReq);

  const userId = user ? user.id : "usr_tenant_a_tourism";
  const sites = await tenantRepository.listSitesForUser(userId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Websites</h1>
          <p className="text-sm text-zinc-500">
            Manage your websites, configure domains, preview drafts, and launch updates.
          </p>
        </div>
        <Link
          href="/build"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition-colors shadow-xs shrink-0 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Website</span>
        </Link>
      </div>

      {/* Websites Grid */}
      {sites.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-white border border-dashed border-zinc-300">
          <Globe className="w-12 h-12 mx-auto text-zinc-400 mb-4 stroke-1" />
          <h2 className="text-base font-semibold text-zinc-900 mb-1">No websites found</h2>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-6">
            Get started by creating your first business website using the AI builder.
          </p>
          <Link
            href="/build"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition-colors shadow-xs"
          >
            <Sparkles className="w-4 h-4" />
            <span>Launch Intake Wizard</span>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" aria-label="Websites Table">
              <thead className="bg-zinc-50/80 border-b border-zinc-200 text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Website Name</th>
                  <th className="py-3.5 px-4">Platform Domain</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Pages</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/70">
                {sites.map((site) => (
                  <tr key={site.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="py-4 px-4 sm:px-6">
                      <div className="font-semibold text-zinc-900">{site.name}</div>
                      <div className="text-xs text-zinc-400 font-mono mt-0.5 truncate max-w-xs">
                        ID: {site.id}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-zinc-600">
                      {site.platformSlug}.fortress.ai
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                          site.lifecycleStatus === "published"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                        }`}
                      >
                        {site.lifecycleStatus}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-zinc-600">
                      5 Pages &middot; 3 Blog Posts
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/preview/${site.id}`}
                          target="_blank"
                          className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                          title="Open Live Preview"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/build?siteId=${site.id}`}
                          className="p-1.5 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Edit in Builder"
                        >
                          <Sparkles className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
