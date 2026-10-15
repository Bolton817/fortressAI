import { describe, it, expect, beforeEach } from "vitest";
import { redactString, redactObject } from "@/core/observability/redaction";
import { metricsCollector } from "@/core/observability/metrics-collector";
import { GET as healthCheckRoute } from "@/app/api/health/route";

describe("Phase 8: Production Hardening — System Health & Observability (TDD §31, §32.1, §32.2, FR-089)", () => {
  beforeEach(() => {
    metricsCollector.reset();
  });

  describe("PII & Secret Redaction (TDD §32.2)", () => {
    it("redacts credit card numbers, bearer tokens, and provider secret keys in strings", () => {
      const raw =
        "User paid with card 4111-2222-3333-4444 using token Bearer eyJhbGciOiJIUzI1Ni. Key sk_live_998877665544.";
      const sanitized = redactString(raw);

      expect(sanitized).not.toContain("4111-2222-3333-4444");
      expect(sanitized).toContain("****-****-****-4444");
      expect(sanitized).not.toContain("eyJhbGciOiJIUzI1Ni");
      expect(sanitized).toContain("Bearer [REDACTED_TOKEN]");
      expect(sanitized).not.toContain("sk_live_998877665544");
      expect(sanitized).toContain("[REDACTED_KEY]");
    });

    it("deeply redacts sensitive keys in nested telemetry objects", () => {
      const telemetryPayload = {
        requestId: "req_123",
        user: {
          id: "usr_456",
          passwordHash: "$scrypt$N=16384$secret_hash_value",
          email: "safari@marahorizon.co.ke",
        },
        payment: {
          providerApiKey: "xkeysib-99881122334455",
          creditCard: "4532-1111-2222-3333",
        },
        aiJob: {
          prompt: "Write a high converting hero section for my safari company",
          tokens: 150,
        },
      };

      const sanitized = redactObject(telemetryPayload);

      expect(sanitized.user.passwordHash).toBe("[REDACTED_SECRET]");
      expect(sanitized.payment.providerApiKey).toBe("[REDACTED_TOKEN]");
      expect(sanitized.payment.creditCard).toBe("[REDACTED]");
      expect(sanitized.aiJob.prompt).toContain("[REDACTED_PROMPT");
      expect(sanitized.aiJob.tokens).toBe(150);
      expect(sanitized.requestId).toBe("req_123");
    });
  });

  describe("Metrics & Telemetry Collector (TDD §31.1, §32.1)", () => {
    it("records requests, calculates latency percentiles, and tracks error rates", () => {
      metricsCollector.recordRequest(200, 25);
      metricsCollector.recordRequest(200, 50);
      metricsCollector.recordRequest(200, 75);
      metricsCollector.recordRequest(404, 100);
      metricsCollector.recordRequest(500, 200);

      const snap = metricsCollector.getMetricsSnapshot();

      expect(snap.requests.total).toBe(5);
      expect(snap.requests.success2xx).toBe(3);
      expect(snap.requests.clientError4xx).toBe(1);
      expect(snap.requests.serverError5xx).toBe(1);
      expect(snap.requests.errorRate).toBe(40);
      expect(snap.requests.latency.min).toBe(25);
      expect(snap.requests.latency.max).toBe(200);
      expect(snap.requests.latency.p50).toBe(75);
    });

    it("records AI generation jobs, credit debits, and publishing lifecycle counters", () => {
      metricsCollector.recordAiJob(1500, 10, true);
      metricsCollector.recordAiJob(2000, 15, true);
      metricsCollector.recordAiJob(500, 0, false);
      metricsCollector.recordPublish(true, false);
      metricsCollector.recordPublish(false, true); // rollback

      const snap = metricsCollector.getMetricsSnapshot();

      expect(snap.ai.totalGenerations).toBe(3);
      expect(snap.ai.successfulGenerations).toBe(2);
      expect(snap.ai.failedGenerations).toBe(1);
      expect(snap.ai.totalCreditsDebited).toBe(25);
      expect(snap.publishing.releasesPublished).toBe(1);
      expect(snap.publishing.rollbacksExecuted).toBe(1);
    });
  });

  describe("Synthetic Multi-Probe /api/health Endpoint", () => {
    it("returns 200 OK with healthy status across all 5 core subsystems", async () => {
      const response = await healthCheckRoute();
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.status).toBe("healthy");
      expect(json.version).toBe("1.0.0");
      expect(json.subsystems.storage.status).toBe("healthy");
      expect(json.subsystems.aiProvider.status).toBe("healthy");
      expect(json.subsystems.registrar.status).toBe("healthy");
      expect(json.subsystems.email.status).toBe("healthy");
      expect(json.subsystems.queues.status).toBe("healthy");
    });
  });
});
