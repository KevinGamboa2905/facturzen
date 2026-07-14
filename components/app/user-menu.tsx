"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut, Settings } from "lucide-react";

import type { PlanId } from "@/lib/plans";
import { PlanBadge } from "@/components/app/plan-badge";

export type MenuUser = {
  name: string | null;
  email: string | null;
  image: string | null;
  plan: PlanId;
  trialDaysLeft: number | null;
};

// Sidebar user block → menu with Réglages + Se déconnecter (PROMPT 10 §5).
export function UserMenu({ user, basePath = "/app" }: { user: MenuUser; basePath?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-2 w-full min-w-52 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-lg"
        >
          <Link
            href={`${basePath}/reglages`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            <Settings className="size-4 text-muted-foreground" />
            Réglages
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => void signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive/90 transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="size-4" />
            Se déconnecter
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu du compte"
        className="flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2 py-2 text-left transition-colors hover:bg-muted"
      >
        <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-sm font-semibold">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className="size-full object-cover" />
          ) : (
            initial
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">{user.name ?? "Mon compte"}</span>
            <PlanBadge plan={user.plan} trialDaysLeft={user.trialDaysLeft} />
          </span>
          <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
        </span>
      </button>
    </div>
  );
}
