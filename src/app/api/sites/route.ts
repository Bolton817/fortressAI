import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/core/auth/auth-guard";
import { tenantRepository } from "@/db/tenant-repository";
import { auditRepository } from "@/db/audit-repository";

const CreateSiteSchema = z.object({
  name: z.string().min(2).max(100),
  platformSlug: z.string().min(2).max(60).regex(/^[a-z0-9\-]+$/, {
    message: "Slug must contain only lowercase letters, numbers, and hyphens.",
  }),
});

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const sites = await tenantRepository.listSitesForUser(user.id);
    return NextResponse.json({
      success: true,
      sites,
    });
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to list sites" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const parsed = CreateSiteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, platformSlug } = parsed.data;
    const newSite = await tenantRepository.createSite(user.id, name, platformSlug);

    auditRepository.record({
      actorUserId: user.id,
      action: "site.create",
      targetType: "site",
      targetId: newSite.id,
      metadataJson: { name, platformSlug },
    });

    return NextResponse.json(
      {
        success: true,
        site: newSite,
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || "Failed to create site" }, { status: 400 });
  }
}
