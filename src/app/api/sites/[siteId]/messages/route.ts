import { NextRequest, NextResponse } from "next/server";
import { routeUserIntent } from "@/ai/conversation/intent-router";
import { applySectionPatch } from "@/ai/conversation/patch-engine";
import { globalActionGuard } from "@/ai/conversation/action-guard";
import { tenantRepository } from "@/db/tenant-repository";
import { seedPhase0Tenants } from "@/db/seed-data";
import { SiteConfiguration } from "@/core/schema/site-config";
import { getCurrentUser } from "@/core/auth/auth-guard";

/**
 * Fortress AI — Conversational Editing & Intent Routing API (TDD §13, FR-030, FR-031)
 * Translates natural-language requests into targeted patches or guarded confirmations.
 */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    seedPhase0Tenants();
    const { siteId } = await params;
    const body = await req.json();
    const userMessage = body.message;

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json(
        { error: { code: "INVALID_MESSAGE", message: "Message string is required." } },
        { status: 400 }
      );
    }

    // Resolve tenant site config with auth support
    const currentUser = await getCurrentUser(req);
    let site;
    if (currentUser) {
      site = await tenantRepository.getSite({ userId: currentUser.id }, siteId);
    } else {
      site = await tenantRepository
        .getSite({ userId: "usr_tenant_a_tourism" }, siteId)
        .catch(async () => tenantRepository.getSite({ userId: "usr_tenant_b_consulting" }, siteId))
        .catch(async () => tenantRepository.getSite({ userId: `usr_owner_${siteId.slice(0, 8)}` }, siteId));
    }

    const currentConfig = await tenantRepository.getDraftConfiguration(
      { userId: site.ownerUserId },
      siteId
    );

    const intent = routeUserIntent(userMessage, currentConfig.theme.themeId);

    // 1. Check for high-impact actions requiring confirmation (FR-032)
    if (intent.requiresExplicitConfirmation) {
      const confirmReq = globalActionGuard.createConfirmationRequest({
        action: "REMOVE_SECTION",
        resourceId: siteId,
        effectSummary: intent.confirmationMessage || "Destructive section action",
      });

      return NextResponse.json({
        intent,
        requiresConfirmation: true,
        confirmationToken: confirmReq.token,
        message: intent.confirmationMessage,
      });
    }

    // 2. Unsupported request handling
    if (intent.type === "UNSUPPORTED") {
      return NextResponse.json({
        intent,
        message: intent.explanation,
        config: currentConfig,
      });
    }

    // 3. Targeted Content Edit (FR-031)
    if (intent.type === "CONTENT_EDIT" && intent.fieldPatches) {
      const updatedConfig = applySectionPatch(currentConfig, {
        pageSlug: intent.targetPageSlug || "/",
        sectionId: intent.targetSectionId || "hero.split",
        contentPatch: intent.fieldPatches,
        expectedVersion: body.expectedVersion ?? currentConfig.version,
      });

      // Save new revision in tenant repository
      await tenantRepository.updateDraftConfiguration(
        { userId: site.ownerUserId },
        siteId,
        updatedConfig,
        `Chat Edit: ${intent.explanation}`
      );

      return NextResponse.json({
        intent,
        message: intent.explanation,
        revisionVersion: updatedConfig.version,
        config: updatedConfig,
      });
    }

    // 4. Style Change
    if (intent.type === "STYLE_CHANGE" && intent.themeId) {
      const updatedConfig: SiteConfiguration = {
        ...currentConfig,
        version: currentConfig.version + 1,
        theme: {
          ...currentConfig.theme,
          themeId: intent.themeId,
        },
      };

      await tenantRepository.updateDraftConfiguration(
        { userId: site.ownerUserId },
        siteId,
        updatedConfig,
        `Chat Style: Switched theme to ${intent.themeId}`
      );

      return NextResponse.json({
        intent,
        message: `Switched visual theme to '${intent.themeId}'.`,
        revisionVersion: updatedConfig.version,
        config: updatedConfig,
      });
    }

    return NextResponse.json({
      intent,
      message: "Request analyzed.",
      config: currentConfig,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: {
          code: err.code || "EDIT_FAILED",
          message: err.message || "Failed to apply conversational edit",
        },
      },
      { status: 400 }
    );
  }
}
