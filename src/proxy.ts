import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Fortress AI — Next.js 16 Edge Proxy (TDD §7.1, §20; Next.js 16 convention)
 * Resolves platform subdomains and custom domains, rewriting to /site/[siteSlug]/...
 */

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Bypass internal and administrative application routes
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
    return NextResponse.next();
  }

  // 2. Normalise host header
  const host = (request.headers.get("host") || "").toLowerCase().split(":")[0];

  // 3. Check for platform subdomain (e.g., mara-safaris.localhost, mara-safaris.fortressai.app)
  const hostParts = host.split(".");
  if (hostParts.length >= 2) {
    const candidateSubdomain = hostParts[0];
    const reservedSubdomains = ["www", "app", "api", "admin", "dashboard", "preview", "status"];

    if (!reservedSubdomains.includes(candidateSubdomain)) {
      // Subdomain detected! Rewrite internally to /site/[candidateSubdomain]/[pathname]
      const url = request.nextUrl.clone();
      const targetPath = pathname === "/" ? "" : pathname;
      url.pathname = `/site/${candidateSubdomain}${targetPath}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, etc.
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
