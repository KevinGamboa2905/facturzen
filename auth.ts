import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/prisma";

// Auth.js (NextAuth v5). Google is the ONLY entry path (PROMPT 2 §1): no magic
// link, no password, no form. Sessions are database-backed via the Prisma
// adapter, so the `session` callback receives the full DB user.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    Google({
      // Reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET from env automatically.
      allowDangerousEmailAccountLinking: true,
    }),
  ],
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
