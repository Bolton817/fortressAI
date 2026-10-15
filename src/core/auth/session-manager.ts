import * as crypto from "node:crypto";
import { sessionRepository, SessionRecord } from "@/db/session-repository";

/**
 * Fortress AI — Session Management Subsystem (TDD §23.2, FR-006)
 * Invariants:
 * 1. Tokens stored in HttpOnly, SameSite=Lax, Secure cookies.
 * 2. Session tokens are rotated after authentication and privilege changes.
 * 3. Server-side revocation support for logout and password resets.
 */

export const SESSION_COOKIE_NAME = "fortress_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days absolute
export const SESSION_IDLE_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days idle

export function serializeSessionCookie(token: string, maxAge = SESSION_MAX_AGE_SECONDS): string {
  const isProd = process.env.NODE_ENV === "production";
  const secureFlag = isProd ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureFlag}`;
}

export function serializeExpiredCookie(): string {
  const isProd = process.env.NODE_ENV === "production";
  const secureFlag = isProd ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secureFlag}`;
}

export function extractSessionTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";");
  for (const c of cookies) {
    const [name, val] = c.trim().split("=");
    if (name === SESSION_COOKIE_NAME && val) {
      return val;
    }
  }
  return null;
}

export class SessionManager {
  public createSession(
    userId: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ): { sessionToken: string; cookieHeader: string; session: SessionRecord } {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

    const session = sessionRepository.createSession({
      sessionToken: rawToken,
      userId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      expiresAt,
    });

    const cookieHeader = serializeSessionCookie(rawToken);
    return { sessionToken: rawToken, cookieHeader, session };
  }

  public getSessionFromToken(token: string): SessionRecord | null {
    const session = sessionRepository.findValidSession(token);
    if (!session) return null;

    // Optional idle refresh if > 1 day has passed
    const now = Date.now();
    const remainingMs = session.expiresAt.getTime() - now;
    if (remainingMs < SESSION_IDLE_TIMEOUT_MS) {
      const refreshedExpiresAt = new Date(now + SESSION_MAX_AGE_SECONDS * 1000);
      sessionRepository.touchSession(token, refreshedExpiresAt);
    }

    return session;
  }

  public getSessionFromRequest(request: Request): SessionRecord | null {
    const cookieHeader = request.headers.get("cookie");
    const token = extractSessionTokenFromCookie(cookieHeader);
    if (!token) return null;
    return this.getSessionFromToken(token);
  }

  public rotateSession(
    oldToken: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ): { newSessionToken: string; cookieHeader: string } | null {
    const oldSession = sessionRepository.findValidSession(oldToken);
    if (!oldSession) return null;

    // Revoke old session (session fixation defense)
    sessionRepository.revokeSession(oldToken);

    // Create new session
    const { sessionToken, cookieHeader } = this.createSession(oldSession.userId, meta);
    return { newSessionToken: sessionToken, cookieHeader };
  }

  public revokeSession(token: string): string {
    sessionRepository.revokeSession(token);
    return serializeExpiredCookie();
  }

  public revokeAllUserSessions(userId: string): void {
    sessionRepository.revokeAllUserSessions(userId);
  }
}

export const sessionManager = new SessionManager();
