import * as crypto from "node:crypto";
import { verificationTokenRepository, VerificationTokenRecord } from "@/db/verification-token-repository";

/**
 * Fortress AI — Secure Token Service (TDD §23.1, FR-004, FR-005)
 * Issues and validates single-use time-limited tokens for email verification and password reset.
 * Tokens are stored as SHA-256 hashes to prevent token database leaks.
 */

export function generateSecureToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createEmailVerificationToken(email: string, expiresInHours = 24): { token: string; record: VerificationTokenRecord } {
  // Invalidate any older tokens for this email
  verificationTokenRepository.invalidateOlderTokens(email, "email_verify");

  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  const record = verificationTokenRepository.createToken({
    tokenHash,
    identifier: email,
    tokenType: "email_verify",
    expiresAt,
  });

  return { token: rawToken, record };
}

export function createPasswordResetToken(email: string, expiresInMinutes = 15): { token: string; record: VerificationTokenRecord } {
  // Invalidate any older tokens for this email
  verificationTokenRepository.invalidateOlderTokens(email, "password_reset");

  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  const record = verificationTokenRepository.createToken({
    tokenHash,
    identifier: email,
    tokenType: "password_reset",
    expiresAt,
  });

  return { token: rawToken, record };
}

export function verifyAndConsumeToken(
  rawToken: string,
  identifier: string,
  tokenType: "email_verify" | "password_reset"
): boolean {
  const tokenHash = hashToken(rawToken);
  const tokenRecord = verificationTokenRepository.findValidToken(tokenHash, tokenType);

  if (!tokenRecord) {
    return false;
  }

  if (tokenRecord.identifier.toLowerCase() !== identifier.toLowerCase().trim()) {
    verificationTokenRepository.incrementAttempts(tokenHash);
    return false;
  }

  // Mark token as used (single-use invariant)
  verificationTokenRepository.markUsed(tokenHash);
  return true;
}
