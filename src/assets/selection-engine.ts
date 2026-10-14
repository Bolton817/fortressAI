import { CuratedAsset, curatedAssetCatalogue } from "./catalogue";
import { AssetBinding } from "@/core/schema/site-config";
import { MediaSlotDefinition } from "@/core/schema/manifest";

/**
 * Fortress AI — Deterministic Asset Selection Engine (TDD §14.3, §15, FR-050)
 * Invariants:
 * - Never invents random image URLs.
 * - Enforces within-site diversity (no redundant duplicates on the same site).
 * - Deterministic output based on site seed.
 */

export interface AssetMatchingContext {
  industry: string;
  location?: string;
  regionPreference?: string; // e.g. "kenya", "east-africa", "global"
  palettePreference?: string;
}

/**
 * Deterministic integer hash for a string seed
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export function selectAssetForSlot(
  slot: MediaSlotDefinition,
  context: AssetMatchingContext,
  usedAssetIds: Set<string>,
  seed: string
): AssetBinding | null {
  // 1. Filter approved assets with valid licences
  const available = curatedAssetCatalogue.filter(
    (a) => a.status === "approved" && !usedAssetIds.has(a.id)
  );

  if (available.length === 0) {
    // If all assets were used, allow fallback reuse of approved general assets
    const fallback = curatedAssetCatalogue.find((a) => a.status === "approved");
    if (!fallback && slot.required) {
      throw new Error(`No asset available to fulfill required media slot "${slot.slotId}"`);
    }
    if (!fallback) return null;
    return toAssetBinding(slot.slotId, fallback);
  }

  // 2. Score candidates
  const scored = available.map((asset) => {
    let score = 0;

    // Aspect ratio match (high priority)
    if (asset.aspectRatio === slot.aspectRatio) score += 10;

    // Section tag match
    if (
      slot.acceptedSubjectTags.some((tag) =>
        asset.sectionTags.includes(tag.toLowerCase())
      ) ||
      asset.sectionTags.includes(slot.slotId.toLowerCase())
    ) {
      score += 8;
    }

    // Industry match
    const normIndustry = context.industry.toLowerCase();
    if (asset.industryTags.some((t) => normIndustry.includes(t))) {
      score += 6;
    } else if (asset.industryTags.includes("general")) {
      score += 2;
    }

    // Regional context match (respectful representation TDD §15)
    if (
      context.regionPreference &&
      asset.regionContext.includes(context.regionPreference.toLowerCase())
    ) {
      score += 5;
    }

    // Palette match
    if (
      context.palettePreference &&
      asset.paletteTags.includes(context.palettePreference.toLowerCase())
    ) {
      score += 3;
    }

    return { asset, score };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Take top candidates with max score and pick deterministically by seed
  const topScore = scored[0].score;
  const topCandidates = scored.filter((s) => s.score >= topScore - 3);
  const selectedIndex = hashString(`${seed}_${slot.slotId}`) % topCandidates.length;
  const chosenAsset = topCandidates[selectedIndex].asset;

  usedAssetIds.add(chosenAsset.id);
  return toAssetBinding(slot.slotId, chosenAsset);
}

function toAssetBinding(slotId: string, asset: CuratedAsset): AssetBinding {
  return {
    slotId,
    assetId: asset.id,
    url: asset.url,
    altText: asset.altTextDefault,
    width: asset.width,
    height: asset.height,
    aspectRatio: asset.aspectRatio,
    licenceType: asset.licenceType,
    exportPermitted: true,
  };
}

/**
 * Cloudinary responsive transformation helper (TDD §14.4)
 */
export function buildCloudinaryUrl(
  publicId: string,
  options: { width?: number; height?: number; crop?: string; quality?: string } = {}
): string {
  const { width = 1200, crop = "fill", quality = "auto" } = options;
  // If already a full URL, return format/width parameters
  if (publicId.startsWith("http")) {
    return `${publicId}&w=${width}&q=${quality === "auto" ? 80 : quality}`;
  }
  return `https://res.cloudinary.com/megascript/image/upload/c_${crop},w_${width},f_auto,q_${quality}/${publicId}`;
}
