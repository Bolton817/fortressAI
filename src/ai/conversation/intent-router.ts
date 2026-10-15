import { ParsedIntent } from "./types";
import { defaultThemes } from "@/themes/default-themes";

/**
 * Fortress AI — Chat Intent Router (TDD §13.2, FR-030, FR-032)
 * Maps natural-language requests into supported, schema-governed actions.
 * Invariant: Action handlers are fixed and allowlisted. Never fake functionality
 * or promise unavailable integrations.
 */

export function routeUserIntent(
  userMessage: string,
  currentThemeId = "modern-slate"
): ParsedIntent {
  const msg = userMessage.trim().toLowerCase();

  // 1. Check for Unsupported Features (TDD §2.2, §13.2)
  const unsupportedKeywords = [
    "cart",
    "shopping cart",
    "checkout flow",
    "ecommerce store",
    "crypto",
    "bitcoin",
    "ethereum",
    "database query",
    "custom php",
    "write react code",
    "custom javascript snippet",
    "wordpress plugin",
    "login portal for my users",
  ];

  for (const kw of unsupportedKeywords) {
    if (msg.includes(kw)) {
      return {
        type: "UNSUPPORTED",
        confidence: 0.95,
        explanation: `Feature '${kw}' is outside the current platform boundary. Fortress AI focuses on high-converting, accessible multipage business websites without arbitrary backend scripts or custom ecommerce stores.`,
        requiresExplicitConfirmation: false,
      };
    }
  }

  // 2. Check for Theme / Style Adjustments
  const themeKeywords = ["theme", "color", "palette", "aesthetic", "style", "font"];
  const isThemeRequest = themeKeywords.some((kw) => msg.includes(kw));

  if (isThemeRequest) {
    // Check if user specifically requested a theme name
    let targetTheme: string | undefined;
    for (const id of Object.keys(defaultThemes)) {
      if (msg.includes(id)) {
        targetTheme = id;
        break;
      }
    }

    if (!targetTheme) {
      if (msg.includes("dark") || msg.includes("slate") || msg.includes("blue")) targetTheme = "modern-slate";
      else if (msg.includes("warm") || msg.includes("safari") || msg.includes("green")) targetTheme = "warm-editorial";
      else if (msg.includes("craft") || msg.includes("amber") || msg.includes("stone")) targetTheme = "bold-craft";
      else if (msg.includes("vibrant") || msg.includes("purple") || msg.includes("cyan")) targetTheme = "vibrant-pulse";
      else if (msg.includes("ocean") || msg.includes("clean") || msg.includes("teal")) targetTheme = "ocean-minimal";
      else if (msg.includes("luxury") || msg.includes("gold") || msg.includes("heritage")) targetTheme = "heritage-luxury";
    }

    return {
      type: "STYLE_CHANGE",
      confidence: 0.88,
      themeId: targetTheme || currentThemeId,
      explanation: `Switch site visual direction to '${targetTheme || "requested style"}'.`,
      requiresExplicitConfirmation: false,
    };
  }

  // 3. Check for Image / Media Swap
  if (msg.includes("image") || msg.includes("photo") || msg.includes("picture") || msg.includes("swap image")) {
    let slotId = "hero_image";
    if (msg.includes("about")) slotId = "story_image";
    else if (msg.includes("card") || msg.includes("service")) slotId = "service_image";

    return {
      type: "IMAGE_CHANGE",
      confidence: 0.85,
      assetSlotId: slotId,
      explanation: `Swap curated licensed image for slot '${slotId}'.`,
      requiresExplicitConfirmation: false,
    };
  }

  // 4. Check for Section Mutation (Add / Remove)
  if (msg.includes("remove") || msg.includes("delete") || msg.includes("hide")) {
    return {
      type: "SECTION_MUTATION",
      confidence: 0.82,
      explanation: "Remove section from page layout.",
      requiresExplicitConfirmation: true,
      confirmationMessage: "Removing this section will change the page structure. Confirm deletion?",
    };
  }

  // 5. Check for Blog Generation
  if (msg.includes("blog") && (msg.includes("write") || msg.includes("create") || msg.includes("article") || msg.includes("post"))) {
    return {
      type: "BLOG_GENERATE",
      confidence: 0.9,
      explanation: "Draft a new industry article in draft status.",
      requiresExplicitConfirmation: false,
    };
  }

  // 6. Default: Targeted Content Edit (FR-031)
  let targetPage = "/";
  if (msg.includes("about")) targetPage = "/about";
  else if (msg.includes("service")) targetPage = "/services";
  else if (msg.includes("contact")) targetPage = "/contact";
  else if (msg.includes("blog")) targetPage = "/blog";

  // Extract clean text if user used quotes
  const quoteMatch = userMessage.match(/["'“]([^"'”]+)["'”]/);
  const patchValue = quoteMatch ? quoteMatch[1] : userMessage.replace(/^change\s+/i, "");

  const targetSection = "hero.split";
  let fieldKey = "headline";
  if (msg.includes("headline") || msg.includes("title")) {
    fieldKey = "headline";
  } else if (msg.includes("subhead") || msg.includes("description") || msg.includes("intro")) {
    fieldKey = "subhead";
  }

  return {
    type: "CONTENT_EDIT",
    confidence: 0.92,
    targetPageSlug: targetPage,
    targetSectionId: targetSection,
    fieldPatches: {
      [fieldKey]: patchValue,
    },
    explanation: `Update ${fieldKey} on page '${targetPage}' to: "${patchValue}".`,
    requiresExplicitConfirmation: false,
  };
}
