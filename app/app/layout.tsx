import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { effectivePlan, trialDaysLeft } from "@/lib/plans";
import { SidebarNav, BottomNav } from "@/components/app/app-nav";
import { Logo } from "@/components/marketing/logo";
import { UpgradeProvider } from "@/components/app/upgrade-modal";
import { UserMenu, type MenuUser } from "@/components/app/user-menu";
import { NavGuard } from "@/components/app/nav-guard";

// Auth + onboarding gate for the whole app shell (server runtime → Prisma OK).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  if (!session.user.onboardingCompletedAt) redirect("/bienvenue");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      plan: true,
      trialEndsAt: true,
      stripeSubscriptionId: true,
    },
  });
  if (!user) redirect("/connexion");

  const menuUser: MenuUser = {
    name: user.name,
    email: user.email,
    image: user.image,
    plan: effectivePlan(user),
    trialDaysLeft: trialDaysLeft(user),
  };

  return (
    <UpgradeProvider>
      <NavGuard />
      <div className="min-h-dvh bg-background text-foreground">
        {/* Mobile header with account access */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur md:hidden">
          <Link href="/app" aria-label="FacturZen, tableau de bord">
            <Logo />
          </Link>
          <div className="w-44">
            <UserMenu user={menuUser} />
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[1400px]">
          <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border px-4 py-6 md:flex">
            <Link href="/app" className="px-2" aria-label="FacturZen, tableau de bord">
              <Logo />
            </Link>
            <div className="mt-8">
              <SidebarNav basePath="/app" />
            </div>
            <div className="mt-auto border-t border-border pt-3">
              <UserMenu user={menuUser} />
            </div>
          </aside>

          <main className="min-w-0 flex-1 pb-24 md:pb-0">{children}</main>
        </div>

        <BottomNav basePath="/app" />
      </div>
    </UpgradeProvider>
  );
}
