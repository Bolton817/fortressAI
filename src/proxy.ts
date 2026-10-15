import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { domainRepository } from "@/db/domain-repository";
import { rateLimiter } from "@/core/security/rate-limiter";

/**
 * Fortress AI — Next.js 16 Edge Proxy & Security Layer (TDD §7.1, §20, §31.1, §34.1)
 * Next.js 16 replaces middleware.ts with proxy.ts.
 * Handles:
 * 1. Sliding-window auth rate limiting (5 req/min per IP)
 * 2. Enterprise security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
 * 3. Platform subdomain & custom domain rewrites to /site/[siteSlug]/...
 */

function applySecurityHeaders(res: NextResponse): NextResponse {
  // Content Security Policy
  res.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'self';"
  );

  // Anti-clickjacking (SAMEORIGIN allows /preview iframe in dashboard)
  res.headers.set("X-Frame-Options", "SAMEORIGIN");

  // Prevent MIME-sniffing
  res.headers.set("X-Content-Type-Options", "nosniff");

  // Strict-Transport-Security (1 year)
  res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  // Referrer policy
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions policy
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return res;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Auth Rate Limiting Guard
  if (pathname.startsWith("/api/auth/login") || pathname.startsWith("/api/auth/register")) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const limitCheck = rateLimiter.checkAuth(ip);

    if (!limitCheck.allowed) {
      return new NextResponse(
        JSON.stringify({
          error: "Too many requests. Please wait before trying again.",
          retryAfter: limitCheck.resetSeconds,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": limitCheck.resetSeconds.toString(),
            "X-RateLimit-Limit": limitCheck.limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": limitCheck.resetSeconds.toString(),
          },
        }
      );
    }
  }

  // 2. Bypass custom domain rewrite for internal and administrative application routes
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/build") ||
    pathname.startsWith("/preview") ||
    pathname.startsWith("/site") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.includes(".")
  ) {
    return applySecurityHeaders(NextResponse.next());
  }

  // 3. Normalise host header & rewrite domain
  const host = (request.headers.get("host") || "").toLowerCase().split(":")[0];
  const resolved = domainRepository.resolveSiteIdFromHostname(host);
  if (resolved) {
    const url = request.nextUrl.clone();
    const targetPath = pathname === "/" ? "" : pathname;
    url.pathname = `/site/${resolved.slug}${targetPath}`;
    return applySecurityHeaders(NextResponse.rewrite(url));
  }

  return applySecurityHeaders(NextResponse.next());
}

// Named alias for backward compatibility with testing suites
export const middleware = proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
