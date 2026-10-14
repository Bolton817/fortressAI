import { notFound } from "next/navigation";
import { tenantRepository } from "@/db/tenant-repository";
import { seedPhase0Tenants } from "@/db/seed-data";
import { SiteRenderer } from "@/renderer/site-renderer";

export const dynamic = "force-dynamic";

interface PreviewPageProps {
  params: Promise<{ siteId: string }>;
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  // Ensure seed data is populated for Phase 0 proof
  seedPhase0Tenants();

  const { siteId } = await params;

  try {
    // For Phase 0 preview, resolve site and fetch using owner context
    const site = await tenantRepository.getSite({ userId: "usr_tenant_a_tourism" }, siteId).catch(async () => {
      // Fallback check for tenant B context
      return await tenantRepository.getSite({ userId: "usr_tenant_b_consulting" }, siteId);
    });

    const config = await tenantRepository.getDraftConfiguration(
      { userId: site.ownerUserId },
      siteId
    );

    return <SiteRenderer config={config} currentSlug="/" />;
  } catch (error) {
    notFound();
  }
}
