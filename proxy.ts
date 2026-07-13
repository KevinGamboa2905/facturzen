import { NextResponse, type NextRequest } from "next/server";

const DEMO_COOKIE = "fz_demo";

// Mint an anonymous sandbox token for /demo visitors. Runs on the edge, so it
// only touches cookies (no DB — never import Prisma here) — the workspace itself
// is materialized lazily in a Server Component keyed by this token.
// Next 16 renamed Middleware → Proxy; the behaviour is identical.
export function proxy(request: NextRequest) {
  const existing = request.cookies.get(DEMO_COOKIE)?.value;
  const token = existing ?? crypto.randomUUID();

  // Make the token visible to the current render, not just the next request.
  request.cookies.set(DEMO_COOKIE, token);
  const response = NextResponse.next({ request });

  if (!existing) {
    response.cookies.set(DEMO_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24h, mirrors demoExpiresAt
    });
  }
  return response;
}

export const config = {
  matcher: ["/demo/:path*"],
};
