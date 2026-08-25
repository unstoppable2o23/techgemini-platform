import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";
  const subdomain = extractSubdomain(hostname);

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    const cookie = request.headers.get("cookie") || "";
    if (
      cookie.includes("next-auth.session-token") ||
      cookie.includes("__Secure-next-auth.session-token") ||
      cookie.includes("__Host-next-auth.session-token")
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  const tenantId = subdomain === "default" ? "default" : subdomain;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id", tenantId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  return response;
}

function extractSubdomain(hostname: string): string {
  const parts = hostname.replace(/:\d+$/, "").split(".");
  if (
    hostname.includes("localhost") ||
    hostname.includes("127.0.0.1") ||
    parts.length < 3
  ) {
    return "default";
  }
  return parts[0];
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
