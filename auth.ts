import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/prisma";
import { flags, isProduction } from "@/lib/env";

// Auth.js (NextAuth v5). Google is the primary entry path, but OPTIONAL at
// deploy: the provider is only registered when both keys are present, so the
// app boots and runs (landing + demo) with zero providers. Sessions are
// database-backed via the Prisma adapter, so the `session` callback receives
// the full DB user. (The dev-only shortcut sign-in lives in
// app/api/dev-login — a Credentials provider can't persist a DB session.)
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  // Vercel sits behind a proxy: trust the forwarded host so callback URLs are
  // built from the real deployment origin (also satisfied by AUTH_TRUST_HOST=true,
  // which is set automatically on Vercel — we make it explicit here too).
  trustHost: true,
  // Secure, host-locked session cookie in production; relaxed over http in dev.
  useSecureCookies: isProduction,
  providers: flags.googleAuth
    ? [
        Google({
          // Reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET from env automatically.
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : [],
  pages: {
    signIn: "/connexion",
    error: "/connexion", // OAuth errors surface on the sign-in page, never a raw error page.
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        // The Prisma adapter returns the full DB row; surface the app fields.
        const dbUser = user as typeof user & {
          onboardingCompletedAt: Date | null;
          isDemo: boolean;
        };
        session.user.id = dbUser.id;
        session.user.onboardingCompletedAt = dbUser.onboardingCompletedAt ?? null;
        session.user.isDemo = dbUser.isDemo ?? false;
      }
      return session;
    },
  },
});
