import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/api/health", "/api/auth/login", "/api/auth/logout"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow Next.js internals, static assets, and public paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/api/webhooks/whatsapp")
  ) {
    return withSecurityHeaders(NextResponse.next());
  }

  // Allow background cron / worker tick when authenticated via CRON_SECRET
  const cronSecret = (process.env.CRON_SECRET || "").trim();
  if (pathname === "/api/scheduler/tick" && cronSecret) {
    const authHeader = request.headers.get("authorization") || "";
    if (authHeader === `Bearer ${cronSecret}`) {
      return withSecurityHeaders(NextResponse.next());
    }
  }

  // Check if WORKSPACE_ACCESS_PASSCODE is configured
  const requiredPasscode = (process.env.WORKSPACE_ACCESS_PASSCODE || "").trim();
  if (!requiredPasscode) {
    // Open local mode when no passcode is configured in .env
    return withSecurityHeaders(NextResponse.next());
  }

  // Verify cookie or Authorization Bearer token
  const cookieToken = request.cookies.get("remindflow_access_token")?.value;
  const authHeader = request.headers.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";

  const isAuthorized =
    cookieToken === requiredPasscode || bearerToken === requiredPasscode;

  if (!isAuthorized) {
    if (pathname.startsWith("/api/")) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            error:
              "Unauthorized. Provide a valid workspace passcode cookie or Authorization Bearer token.",
          },
          { status: 401 }
        )
      );
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return withSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  return withSecurityHeaders(NextResponse.next());
}

function withSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
