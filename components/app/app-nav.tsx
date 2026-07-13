"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileSignature,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV_ITEMS: NavItem[] = [
  { href: "", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/factures", label: "Factures", icon: FileText },
  { href: "/devis", label: "Devis", icon: FileSignature },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/prestations", label: "Prestations", icon: Package },
  { href: "/reglages", label: "Réglages", icon: Settings },
];

function useActive(basePath: string) {
  const pathname = usePathname();
  return (href: string) => {
    const full = `${basePath}${href}`;
    return href === "" ? pathname === full : pathname.startsWith(full);
  };
}

export function SidebarNav({ basePath }: { basePath: string }) {
  const isActive = useActive(basePath);
  return (
    <nav aria-label="Navigation" className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={`${basePath}${item.href}`}
            prefetch
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <item.icon className="size-5 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav({ basePath }: { basePath: string }) {
  const isActive = useActive(basePath);
  return (
    <nav
      aria-label="Navigation"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-card/95 backdrop-blur md:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={`${basePath}${item.href}`}
            prefetch
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 py-2.5 text-[10px] font-medium transition-colors",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <item.icon className="size-5 shrink-0" aria-hidden="true" />
            <span className="max-w-full truncate leading-none">{item.label.split(" ")[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
