import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SidebarNav, BottomNav } from "@/components/app/app-nav";
import { Logo } from "@/components/marketing/logo";

// Auth + onboarding gate for the whole app shell (server runtime → Prisma OK).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  if (!session.user.onboardingCompletedAt) redirect("/bienvenue");

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1400px]">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border px-4 py-6 md:flex">
          <Link href="/app" className="px-2" aria-label="FacturZen, tableau de bord">
            <Logo />
          </Link>
          <div className="mt-8">
            <SidebarNav basePath="/app" />
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-24 md:pb-0">{children}</main>
      </div>

      <BottomNav basePath="/app" />
    </div>
  );
}
