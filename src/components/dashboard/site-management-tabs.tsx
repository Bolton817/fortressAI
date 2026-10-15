"use client";

import React, { useState } from "react";
import { SitePublishPanel } from "./site-publish-panel";
import { DomainManagementPanel } from "./domain-management-panel";
import { UploadCloud, Globe } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"publish" | "domains">("publish");

  return (
    <div className="space-y-6">
      {/* Top Segmented Tabs */}
      <div className="flex rounded-xl bg-zinc-100 p-1 w-fit border border-zinc-200">
        <button
          onClick={() => setActiveTab("publish")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
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
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "domains"
              ? "bg-white text-zinc-900 shadow-xs"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          <span>Custom Domains & DNS</span>
        </button>
      </div>

      {activeTab === "publish" ? (
        <SitePublishPanel
          siteId={siteId}
          siteName={siteName}
          platformSlug={platformSlug}
          initialLifecycleStatus={initialLifecycleStatus}
          initialPublishedReleaseId={initialPublishedReleaseId}
        />
      ) : (
        <DomainManagementPanel siteId={siteId} platformSlug={platformSlug} />
      )}
    </div>
  );
}
