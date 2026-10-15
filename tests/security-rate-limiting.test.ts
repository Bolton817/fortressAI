import { describe, it, expect, beforeEach } from "vitest";
import { rateLimiter } from "@/core/security/rate-limiter";
import { middleware } from "@/proxy";
import { NextRequest } from "next/server";

describe("Phase 8: Production Hardening — Security & Adaptive Rate Limiting (TDD §31.1, §34.1)", () => {
  beforeEach(() => {
    rateLimiter.clearAll();
  });

  describe("Sliding-Window Rate Limiter Engine", () => {
    it("enforces auth endpoint rate limit (5 requests per 60 seconds per IP)", () => {
      const ip = "192.168.1.10";
      const now = 1000000;

      for (let i = 1; i <= 5; i++) {
        const res = rateLimiter.checkAuth(ip, now + i * 100);
        expect(res.allowed).toBe(true);
        expect(res.remaining).toBe(5 - i);
      }

      // 6th request within window is rejected
      const rejected = rateLimiter.checkAuth(ip, now + 1000);
      expect(rejected.allowed).toBe(false);
      expect(rejected.remaining).toBe(0);
      expect(rejected.resetSeconds).toBeGreaterThan(0);

      // Request after window expires (61 seconds later) is permitted
      const later = rateLimiter.checkAuth(ip, now + 61000);
      expect(later.allowed).toBe(true);
    });

    it("enforces AI generation concurrency limit (10 requests per 60 seconds per tenant)", () => {
      const userId = "usr_gen_throttle_test";
      const now = 2000000;

      for (let i = 1; i <= 10; i++) {
        expect(rateLimiter.checkAiGeneration(userId, now + i * 100).allowed).toBe(true);
      }

      const throttled = rateLimiter.checkAiGeneration(userId, now + 1200);
      expect(throttled.allowed).toBe(false);
      expect(throttled.remaining).toBe(0);
    });

    it("enforces static export rate limit (3 requests per 15 minutes per tenant)", () => {
      const userId = "usr_export_throttle_test";
      const now = 3000000;

      expect(rateLimiter.checkExport(userId, now).allowed).toBe(true);
      expect(rateLimiter.checkExport(userId, now + 1000).allowed).toBe(true);
      expect(rateLimiter.checkExport(userId, now + 2000).allowed).toBe(true);

      // 4th export within 15 min window is rejected
      const blocked = rateLimiter.checkExport(userId, now + 3000);
      expect(blocked.allowed).toBe(false);
      expect(blocked.resetSeconds).toBeGreaterThan(0);
    });
  });

  describe("Edge Security Middleware Integration", () => {
    it("attaches defensive HTTP security headers to outgoing responses", () => {
      const req = new NextRequest("http://localhost:3000/dashboard");
      const res = middleware(req);

      expect(res.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
      expect(res.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(res.headers.get("Strict-Transport-Security")).toContain("max-age=31536000");
      expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    });

    it("intercepts rapid repeated login attempts with HTTP 429 Too Many Requests", () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        headers: { "x-forwarded-for": "10.0.0.99" },
      });

      // Burn allowed attempts
      for (let i = 0; i < 5; i++) {
        middleware(req);
      }

      // 6th attempt triggers 429
      const blocked = middleware(req);
      expect(blocked.status).toBe(429);
      expect(blocked.headers.get("Retry-After")).toBeDefined();
    });
  });
});
