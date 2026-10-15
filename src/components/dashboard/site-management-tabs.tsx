"use client";

import React, { useState } from "react";
import { SitePublishPanel } from "./site-publish-panel";
import { DomainManagementPanel } from "./domain-management-panel";
import { SiteExportPanel } from "./export/site-export-panel";
import { UploadCloud, Globe, Download } from "lucide-react";

interface SiteManagementTabsProps {
  siteId: string;
  siteName: string;
  platformSlug: string;
  initialLifecycleStatus: string;
  initialPublishedReleaseId?: string | null;
}

export function SiteManagementTabs({
  siteId,
  siteName,
  platformSlug,
  initialLifecycleStatus,
  initialPublishedReleaseId,
}: SiteManagementTabsProps) {
  const [activeTab, setActiveTab] = useState<"publish" | "domains" | "export">("publish");

  return (
    <div className="space-y-6">
      {/* Top Segmented Tabs */}
      <div className="flex flex-wrap rounded-xl bg-zinc-100 p-1 w-fit border border-zinc-200">
        <button
          onClick={() => setActiveTab("publish")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "publish"
              ? "bg-white text-zinc-900 shadow-xs"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
          <span>Release & Publishing</span>
        </button>

        <button
          onClick={() => setActiveTab("domains")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "domains"
              ? "bg-white text-zinc-900 shadow-xs"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          <span>Custom Domains & DNS</span>
        </button>

        <button
          onClick={() => setActiveTab("export")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "export"
              ? "bg-white text-zinc-900 shadow-xs"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <Download className="w-3.5 h-3.5 text-indigo-600" />
          <span>Static Export & Portability</span>
        </button>
      </div>

      {activeTab === "publish" && (
        <SitePublishPanel
          siteId={siteId}
          siteName={siteName}
          platformSlug={platformSlug}
          initialLifecycleStatus={initialLifecycleStatus}
          initialPublishedReleaseId={initialPublishedReleaseId}
        />
      )}

      {activeTab === "domains" && (
        <DomainManagementPanel siteId={siteId} platformSlug={platformSlug} />
      )}

      {activeTab === "export" && (
        <SiteExportPanel
          siteId={siteId}
          siteName={siteName}
          platformSlug={platformSlug}
        />
      )}
    </div>
  );
}
