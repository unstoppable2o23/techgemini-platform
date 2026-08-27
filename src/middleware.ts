import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const AUTH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
];

export async function middleware(request: NextRequest) {
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

  // Validate the session token instead of only checking cookie presence.
  // A present-but-expired cookie previously caused a redirect loop between
  // /auth/login (this middleware) and /dashboard (getServerSession -> null).
  let isAuthenticated = false;
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    isAuthenticated = Boolean(token);
  } catch {
    isAuthenticated = false;
  }

  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  const tenantId = subdomain === "default" ? "default" : subdomain;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id", tenantId);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
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
