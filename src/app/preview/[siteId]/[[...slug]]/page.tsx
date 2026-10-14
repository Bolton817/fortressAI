import { notFound } from "next/navigation";
import { tenantRepository } from "@/db/tenant-repository";
import { seedPhase0Tenants } from "@/db/seed-data";
import { SiteRenderer } from "@/renderer/site-renderer";
import { SiteConfiguration } from "@/core/schema/site-config";

export const dynamic = "force-dynamic";

interface PreviewPageProps {
  params: Promise<{ siteId: string; slug?: string[] }>;
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  seedPhase0Tenants();

  const { siteId, slug } = await params;
  const currentSlug = slug && slug.length > 0 ? `/${slug.join("/")}` : "/";
  let config: SiteConfiguration;

  try {
    const site = await tenantRepository
      .getSite({ userId: "usr_tenant_a_tourism" }, siteId)
      .catch(async () => {
        return await tenantRepository.getSite({ userId: "usr_tenant_b_consulting" }, siteId);
      })
      .catch(async () => {
        return await tenantRepository.getSite({ userId: "usr_tenant_c_composed" }, siteId);
      });

    config = await tenantRepository.getDraftConfiguration(
      { userId: site.ownerUserId },
      siteId
    );
  } catch {
    notFound();
  }

  return (
    <SiteRenderer
      config={config}
      currentSlug={currentSlug}
      linkPrefix={`/preview/${siteId}`}
    />
  );
}
