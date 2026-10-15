import { describe, it, expect, beforeEach } from "vitest";
import { hashPassword, verifyPassword, validatePasswordStrength } from "@/core/auth/password";
import {
  createEmailVerificationToken,
  createPasswordResetToken,
  verifyAndConsumeToken,
} from "@/core/auth/tokens";
import { sessionManager } from "@/core/auth/session-manager";
import { userRepository } from "@/db/user-repository";
import { sessionRepository } from "@/db/session-repository";
import { verificationTokenRepository } from "@/db/verification-token-repository";
import { googleOAuthProvider } from "@/core/auth/oauth-provider";

describe("Phase 3: Core Authentication & Security", () => {
  beforeEach(() => {
    userRepository.clearAll();
    sessionRepository.clearAll();
    verificationTokenRepository.clearAll();
  });

  describe("Password Hashing & Strength (FR-001, FR-003)", () => {
    it("validates password strength rules", () => {
      expect(validatePasswordStrength("short").valid).toBe(false);
      expect(validatePasswordStrength("allletters").valid).toBe(false);
      expect(validatePasswordStrength("12345678").valid).toBe(false);
      expect(validatePasswordStrength("ValidPassword123").valid).toBe(true);
    });

    it("hashes and verifies passwords using scrypt with unique salts", () => {
      const password = "SuperSecretPassword123!";
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);

      // Salts must be unique per hash
      expect(hash1).not.toBe(hash2);

      // Verification succeeds with correct password
      expect(verifyPassword(password, hash1)).toBe(true);
      expect(verifyPassword(password, hash2)).toBe(true);

      // Verification fails with incorrect password
      expect(verifyPassword("WrongPassword123!", hash1)).toBe(false);
    });
  });

  describe("Single-Use Verification & Reset Tokens (FR-004, FR-005)", () => {
    it("generates, verifies, and single-use consumes email verification tokens", () => {
      const email = "founder@safari.co.ke";
      const { token } = createEmailVerificationToken(email);

      // Verify succeeds on first use
      const validFirstTime = verifyAndConsumeToken(token, email, "email_verify");
      expect(validFirstTime).toBe(true);

      // Single-use invariant: second use MUST fail
      const validSecondTime = verifyAndConsumeToken(token, email, "email_verify");
      expect(validSecondTime).toBe(false);
    });

    it("rejects token when presented with wrong identifier", () => {
      const email = "owner@safari.co.ke";
      const { token } = createPasswordResetToken(email);

      const invalidMatch = verifyAndConsumeToken(token, "attacker@evil.com", "password_reset");
      expect(invalidMatch).toBe(false);
    });
  });

  describe("Session Lifecycle & Invalidation (FR-006)", () => {
    it("creates, rotates, and revokes sessions", () => {
      const user = userRepository.createUser({
        email: "tour.operator@mara.co.ke",
        displayName: "Juma Mara",
        status: "active",
      });

      // 1. Create session
      const { sessionToken, cookieHeader } = sessionManager.createSession(user.id);
      expect(cookieHeader).toContain("fortress_session=");
      expect(cookieHeader).toContain("HttpOnly");

      const session = sessionManager.getSessionFromToken(sessionToken);
      expect(session).not.toBeNull();
      expect(session?.userId).toBe(user.id);

      // 2. Rotate session (session fixation defense)
      const rotated = sessionManager.rotateSession(sessionToken);
      expect(rotated).not.toBeNull();
      expect(rotated?.newSessionToken).not.toBe(sessionToken);

      // Old session must be invalid
      expect(sessionManager.getSessionFromToken(sessionToken)).toBeNull();
      // New session must be valid
      expect(sessionManager.getSessionFromToken(rotated!.newSessionToken)?.userId).toBe(user.id);

      // 3. Revoke all sessions (e.g., after password change)
      sessionManager.revokeAllUserSessions(user.id);
      expect(sessionManager.getSessionFromToken(rotated!.newSessionToken)).toBeNull();
    });
  });

  describe("Google OAuth Integration (FR-002)", () => {
    it("exchanges mock code, creates user, and links provider account", async () => {
      const profile = await googleOAuthProvider.exchangeCodeAndFetchProfile("mock-google-code");
      expect(profile.emailVerified).toBe(true);

      const user = await googleOAuthProvider.handleOAuthLogin(profile);
      expect(user.emailNormalised).toBe(profile.email.toLowerCase());
      expect(user.displayName).toBe(profile.name);
      expect(user.status).toBe("active");

      // Verify account link
      const account = userRepository.findAccountByProvider("google", profile.id);
      expect(account).not.toBeNull();
      expect(account?.userId).toBe(user.id);
    });
  });
});
