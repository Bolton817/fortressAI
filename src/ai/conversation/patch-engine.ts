import { SiteConfiguration, SiteConfigurationSchema } from "@/core/schema/site-config";
import { SectionPatchRequest } from "./types";
import { RevisionConflictError, SchemaValidationError } from "@/core/errors";
import { sectionRegistry } from "@/registry";

/**
 * Fortress AI — Surgical Section Patch Engine (TDD §8.4, §13.1, §40.5, FR-031)
 * Applies targeted field updates to a specific section on a specific page.
 * Invariant: Preserves unrelated approved content and stable composition;
 * increments config version; optimistic concurrency prevents version conflicts.
 */

export function applySectionPatch(
  config: SiteConfiguration,
  request: SectionPatchRequest
): SiteConfiguration {
  // 1. Optimistic Concurrency Check (TDD §8.4, §39.2)
  if (config.version !== request.expectedVersion) {
    throw new RevisionConflictError(
      `Site configuration was modified elsewhere. Expected version ${request.expectedVersion}, but current is ${config.version}. Refresh and rebase changes.`
    );
  }

  // 2. Locate Target Page
  const pageIndex = config.pages.findIndex((p) => p.slug === request.pageSlug);
  if (pageIndex === -1) {
    throw new SchemaValidationError(`Target page slug '${request.pageSlug}' not found.`);
  }

  const targetPage = config.pages[pageIndex];

  // 3. Locate Target Section
  let sectionIndex = -1;
  if (request.sectionInstanceId) {
    sectionIndex = targetPage.sections.findIndex((s) => s.instanceId === request.sectionInstanceId);
  } else if (request.sectionId) {
    sectionIndex = targetPage.sections.findIndex((s) => s.sectionId === request.sectionId);
  }

  if (sectionIndex === -1) {
    throw new SchemaValidationError(
      `Target section '${request.sectionId || request.sectionInstanceId}' not found on page '${request.pageSlug}'.`
    );
  }

  const targetSection = targetPage.sections[sectionIndex];

  // 4. Merge Content
  const updatedContent = {
    ...targetSection.content,
    ...request.contentPatch,
  };

  // 5. Manifest Schema Verification
  const entry = sectionRegistry.getEntry(targetSection.sectionId);
  if (entry) {
    // Basic verification: required fields are non-empty
    for (const [key, val] of Object.entries(request.contentPatch)) {
      if (typeof val === "string" && val.trim().length === 0) {
        throw new SchemaValidationError(`Field '${key}' cannot be empty.`);
      }
    }
  }

  // 6. Build New Page & Configuration Revision
  const newSections = [...targetPage.sections];
  newSections[sectionIndex] = {
    ...targetSection,
    content: updatedContent,
  };

  const newPages = [...config.pages];
  newPages[pageIndex] = {
    ...targetPage,
    sections: newSections,
  };

  const newConfig: SiteConfiguration = {
    ...config,
    version: config.version + 1,
    pages: newPages,
  };

  // 7. Validate Final Configuration
  return SiteConfigurationSchema.parse(newConfig);
}
