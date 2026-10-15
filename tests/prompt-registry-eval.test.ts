import { describe, it, expect, beforeEach } from "vitest";
import { promptRegistry, PromptVersionRecord } from "@/core/ai/prompt-registry";
import { evaluationHarness } from "@/core/ai/evaluation-harness";
import { auditRepository } from "@/db/audit-repository";

describe("Phase 8: Production Hardening — Prompt & Model Registry (TDD §10, §15, §34.2, FR-088)", () => {
  beforeEach(() => {
    promptRegistry.clearAll();
    auditRepository.clearAll();
  });

  describe("Prompt Registry & Canary Lifecycle", () => {
    it("pins in-flight jobs to immutable prompt versions for reproducible generation", () => {
      const active = promptRegistry.getActivePromptVersion();
      expect(active.version).toBe("1.0.0");
      expect(active.status).toBe("approved");

      // Register canary prompt
      const canaryPrompt: PromptVersionRecord = {
        version: "1.1.0-canary",
        status: "canary",
        model: "gemini-2.5-flash",
        temperature: 0.15,
        systemInstruction: "Optimized prompt for enterprise businesses.",
        sitePlanPromptContract: "Enhanced SitePlan prompt contract",
        pageCopyPromptContract: "Enhanced PageCopy prompt contract",
        maxOutputTokens: 4096,
        publishedAt: new Date().toISOString(),
        evaluatedArchetypes: ["tourism_safari", "law_firm"],
      };
      promptRegistry.registerPromptVersion(canaryPrompt);

      // Job 1 uses active v1.0.0
      const job1Prompt = promptRegistry.pinJobPrompt("job_gen_001");
      expect(job1Prompt.version).toBe("1.0.0");

      // Job 2 explicitly pins canary
      const job2Prompt = promptRegistry.pinJobPrompt("job_gen_002", "1.1.0-canary");
      expect(job2Prompt.version).toBe("1.1.0-canary");

      // Verify retrieval returns pinned version
      expect(promptRegistry.getJobPinnedVersion("job_gen_001").version).toBe("1.0.0");
      expect(promptRegistry.getJobPinnedVersion("job_gen_002").version).toBe("1.1.0-canary");
    });

    it("promotes canary version to active production and records audit event", () => {
      const canaryPrompt: PromptVersionRecord = {
        version: "1.2.0-canary",
        status: "canary",
        model: "gemini-2.5-flash",
        temperature: 0.2,
        systemInstruction: "Canary instructions",
        sitePlanPromptContract: "Contract",
        pageCopyPromptContract: "Copy Contract",
        maxOutputTokens: 4096,
        publishedAt: new Date().toISOString(),
        evaluatedArchetypes: [],
      };
      promptRegistry.registerPromptVersion(canaryPrompt);

      promptRegistry.promoteCanary("1.2.0-canary", "usr_admin_1");

      const active = promptRegistry.getActivePromptVersion();
      expect(active.version).toBe("1.2.0-canary");
      expect(active.status).toBe("approved");

      const audits = auditRepository.findByTarget("prompt", "1.2.0-canary");
      expect(audits).toHaveLength(1);
      expect(audits[0].action).toBe("prompt.rollout_promoted");
    });

    it("executes emergency rollback to previous prompt version without altering customer sites", () => {
      promptRegistry.promoteCanary("1.0.0", "usr_admin_1");

      const canaryPrompt: PromptVersionRecord = {
        version: "1.3.0-faulty",
        status: "approved",
        model: "gemini-2.5-flash",
        temperature: 0.9,
        systemInstruction: "Unstable instructions",
        sitePlanPromptContract: "Contract",
        pageCopyPromptContract: "Copy Contract",
        maxOutputTokens: 4096,
        publishedAt: new Date().toISOString(),
        evaluatedArchetypes: [],
      };
      promptRegistry.registerPromptVersion(canaryPrompt);
      promptRegistry.promoteCanary("1.3.0-faulty", "usr_admin_1");

      // Rollback to 1.0.0
      promptRegistry.rollbackToVersion(
        "1.0.0",
        "Rollback due to high temperature hallucinations in production",
        "usr_admin_1"
      );

      const currentActive = promptRegistry.getActivePromptVersion();
      expect(currentActive.version).toBe("1.0.0");

      const rolledBack = promptRegistry.getPromptVersion("1.3.0-faulty");
      expect(rolledBack?.status).toBe("rolled_back");

      const audits = auditRepository.listEvents({ action: "prompt.rollback" });
      expect(audits).toHaveLength(1);
      expect(audits[0].reason).toContain("Rollback due to high temperature");
    });
  });

  describe("AI Quality Evaluation Benchmark Harness (TDD §34.2)", () => {
    it("passes evaluation across all 6 representative industry archetypes with zero fabricated claims", async () => {
      const report = await evaluationHarness.evaluatePromptVersion("1.0.0");

      expect(report.archetypesTested).toBe(6);
      expect(report.allPassed).toBe(true);

      for (const result of report.results) {
        expect(result.schemaValid).toBe(true);
        expect(result.zeroFabricatedClaims).toBe(true);
        expect(result.requiredPagesPresent).toBe(true);
        expect(result.checksPassed).toBe(result.totalChecks);
      }
    });
  });
});
