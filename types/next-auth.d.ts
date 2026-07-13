import type { DefaultSession } from "next-auth";

// Extend the session user with the fields we surface from the DB user.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      onboardingCompletedAt: Date | null;
      isDemo: boolean;
    } & DefaultSession["user"];
  }
}
