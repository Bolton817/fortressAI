import crypto from "crypto";
import { DownloadTokenPayload } from "./types";

/**
 * Fortress AI — Secure Export Download Tokens (TDD §21.2, FR-082)
 * Generates and verifies HMAC-SHA256 signed, time-bounded tokens for export artifact delivery.
 * Invariant: Expired or tampered tokens are rejected immediately.
 */

const DEFAULT_SECRET = process.env.SESSION_SECRET || "fortress-export-delivery-secret-fallback";
const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes

export function generateDownloadToken(
  payload: { siteId: string; userId: string; exportId: string },
  ttlMs: number = DEFAULT_TTL_MS,
  secret: string = DEFAULT_SECRET
): string {
  const fullPayload: DownloadTokenPayload = {
    ...payload,
    exp: Date.now() + ttlMs,
  };

  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const hmac = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");

  return `${payloadB64}.${hmac}`;
}

export function verifyDownloadToken(
  token: string,
  secret: string = DEFAULT_SECRET
): { valid: boolean; payload?: DownloadTokenPayload; reason?: string } {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return { valid: false, reason: "Malformed token format" };
  }

  const [payloadB64, providedHmac] = token.split(".");
  const expectedHmac = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");

  // Constant-time signature comparison
  if (
    providedHmac.length !== expectedHmac.length ||
    !crypto.timingSafeEqual(Buffer.from(providedHmac), Buffer.from(expectedHmac))
  ) {
    return { valid: false, reason: "Invalid token signature" };
  }

  try {
    const jsonStr = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload = JSON.parse(jsonStr) as DownloadTokenPayload;

    if (Date.now() > payload.exp) {
      return { valid: false, reason: "Token has expired", payload };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, reason: "Failed to parse token payload" };
  }
}
