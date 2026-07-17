import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { flags, isDevelopment } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEV_EMAIL = "dev@facturzen.local";
// Auth.js v5 database-session cookie name over http (dev). Matches what `auth()`
// reads, so the session we mint here is a first-class session.
const SESSION_COOKIE = "authjs.session-token";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Dev-only shortcut sign-in for when Google OAuth isn't configured yet.
//
// The app uses `session.strategy = "database"`, which the Auth.js Credentials
// provider cannot persist (Credentials is JWT-only) — so we mint a real DB
// session directly for a fixed local user. This lets the full authenticated app
// be tested locally without Google.
//
// Hard guard: 404 unless we're in local development AND real Google auth is
// absent. It can therefore never mint a session in production (isDevelopment is
// false there) nor once Google is configured (flags.googleAuth is true).
export async function POST(request: Request) {
  if (!isDevelopment || flags.googleAuth) {
    return new NextResponse("Not found", { status: 404 });
  }

  const user = await prisma.user.upsert({
    where: { email: DEV_EMAIL },
    update: {},
    create: {
      email: DEV_EMAIL,
      name: "Compte développement",
      onboardingCompletedAt: new Date(), // skip onboarding — straight to /app
    },
  });

  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + THIRTY_DAYS_MS);
  await prisma.session.create({ data: { sessionToken, userId: user.id, expires } });

  (await cookies()).set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
    secure: false, // dev is http
  });

  return NextResponse.redirect(new URL("/app", request.url), { status: 303 });
}
