import Link from "next/link";

import { flags } from "@/lib/env";
import { ensureDemoWorkspace } from "@/lib/demo/session";
import { DemoBanner } from "@/components/demo/demo-banner";
import { SidebarNav, BottomNav } from "@/components/app/app-nav";
import { Logo } from "@/components/marketing/logo";
import { ToastProvider } from "@/components/ui/toast";

// Per-visitor sandbox → never statically cached.
export const dynamic = "force-dynamic";

export default async function DemoLayout({ children }: { children: React.ReactNode }) {
  // Materialize the sandbox on first hit (cookie set by middleware).
  await ensureDemoWorkspace();

  return (
    <ToastProvider>
    <div className="min-h-dvh bg-background text-foreground">
      <DemoBanner googleAuth={flags.googleAuth} />
      <div className="mx-auto flex w-full max-w-[1400px]">
        <aside className="sticky top-10 hidden h-[calc(100dvh-2.5rem)] w-60 shrink-0 flex-col border-r border-border px-4 py-6 md:flex">
          <Link href="/demo" className="px-2" aria-label="FacturZen, tableau de bord">
            <Logo />
          </Link>
          <div className="mt-8">
            <SidebarNav basePath="/demo" />
          </div>
          <div className="mt-auto px-3 text-xs text-muted-foreground">
            Espace de démonstration
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-24 md:pb-0">{children}</main>
      </div>

      <BottomNav basePath="/demo" />
    </div>
    </ToastProvider>
  );
}
