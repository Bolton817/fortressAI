import { describe, it, expect } from "vitest";
import { selectAssetForSlot } from "@/assets/selection-engine";
import { MediaSlotDefinition } from "@/core/schema/manifest";

describe("Phase 1 — Asset Catalogue & Selection Engine (TDD §14, §15, FR-050)", () => {
  const heroSlot: MediaSlotDefinition = {
    slotId: "hero_image",
    required: true,
    aspectRatio: "16:9",
    acceptedSubjectTags: ["hero", "landscape", "workspace"],
  };

  const storySlot: MediaSlotDefinition = {
    slotId: "story_image",
    required: false,
    aspectRatio: "4:3",
    acceptedSubjectTags: ["about", "team", "feature"],
  };

  it("selects industry-appropriate asset for Safari tourism context", () => {
    const used = new Set<string>();
    const binding = selectAssetForSlot(
      heroSlot,
      { industry: "Tourism & Safari", regionPreference: "kenya" },
      used,
      "seed_site_1"
    );

    expect(binding).toBeDefined();
    expect(binding?.aspectRatio).toBe("16:9");
    expect(binding?.exportPermitted).toBe(true);
    expect(binding?.assetId).toContain("safari");
  });

  it("enforces within-site visual diversity (no identical asset on two slots)", () => {
    const used = new Set<string>();
    const slot1 = selectAssetForSlot(
      heroSlot,
      { industry: "Tourism & Safari" },
      used,
      "seed_diversity"
    );
    const slot2 = selectAssetForSlot(
      { ...heroSlot, slotId: "hero_image_secondary" },
      { industry: "Tourism & Safari" },
      used,
      "seed_diversity"
    );

    expect(slot1).toBeDefined();
    expect(slot2).toBeDefined();
    expect(slot1?.assetId).not.toBe(slot2?.assetId);
  });

  it("is completely deterministic given the same seed and slot", () => {
    const used1 = new Set<string>();
    const b1 = selectAssetForSlot(heroSlot, { industry: "Consulting" }, used1, "fixed_seed_123");

    const used2 = new Set<string>();
    const b2 = selectAssetForSlot(heroSlot, { industry: "Consulting" }, used2, "fixed_seed_123");

    expect(b1?.assetId).toBe(b2?.assetId);
    expect(b1?.url).toBe(b2?.url);
  });

  it("selects appropriate 4:3 aspect ratio asset for story slot", () => {
    const used = new Set<string>();
    const binding = selectAssetForSlot(
      storySlot,
      { industry: "Tourism & Safari" },
      used,
      "story_seed"
    );
    expect(binding).toBeDefined();
    expect(binding?.aspectRatio).toBe("4:3");
  });
});

