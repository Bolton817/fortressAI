import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/core/auth/auth-guard";
import { tenantRepository } from "@/db/tenant-repository";
import { SitePublishPanel } from "@/components/dashboard/site-publish-panel";
import { ArrowLeft, Sparkles } from "lucide-react";

interface SiteManagePageProps {
  params: Promise<{ siteId: string }>;
}

export default async function SiteManagePage({ params }: SiteManagePageProps) {
  const { siteId } = await params;

  const reqHeaders = await headers();
  const cookie = reqHeaders.get("cookie") || "";
  const dummyReq = new Request("http://localhost", { headers: { cookie } });
  const user = await getCurrentUser(dummyReq);

  if (!user) {
    redirect("/login");
  }

  let site;
  try {
    site = await tenantRepository.getSite({ userId: user.id }, siteId);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Navigation / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/dashboard/websites"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Websites</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{site.name}</h1>
        </div>

        <Link
          href={`/build?siteId=${site.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition-colors shadow-xs self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Open AI Builder</span>
        </Link>
      </div>

      {/* Main Publish & Rollback Management Panel */}
      <SitePublishPanel
        siteId={site.id}
        siteName={site.name}
        platformSlug={site.platformSlug}
        initialLifecycleStatus={site.lifecycleStatus}
        initialPublishedReleaseId={site.publishedReleaseId}
      />
    </div>
  );
}
