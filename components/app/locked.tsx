"use client";

import { Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { requiredPlanFor, planName, type Feature } from "@/lib/plans";
import { useUpgrade } from "@/components/app/upgrade-modal";

// Small inline lock chip: "Inclus dans Indépendant" → opens the upgrade modal.
export function LockBadge({
  feature,
  reason,
  className,
}: {
  feature: Feature;
  reason?: string;
  className?: string;
}) {
  const { open } = useUpgrade();
  const plan = planName(requiredPlanFor(feature));
  return (
    <button
      type="button"
      onClick={() => open(reason ?? `Cette fonctionnalité est incluse dans le plan ${plan}.`)}
      title={`Inclus dans ${plan}`}
      aria-label={`Fonctionnalité verrouillée — incluse dans ${plan}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      <Lock className="size-3" />
      Inclus dans {plan}
    </button>
  );
}

// Wraps a not-included section: shows it dimmed & non-interactive, with a lock
// affordance that opens the upgrade modal. Nothing disappears — it's visible.
export function LockOverlay({
  feature,
  reason,
  children,
}: {
  feature: Feature;
  reason?: string;
  children: React.ReactNode;
}) {
  const { open } = useUpgrade();
  const plan = planName(requiredPlanFor(feature));
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none select-none opacity-45">
        {children}
      </div>
      <button
        type="button"
        onClick={() => open(reason ?? `Cette fonctionnalité est incluse dans le plan ${plan}.`)}
        className="absolute inset-0 grid place-items-center rounded-xl bg-background/30 backdrop-blur-[1px]"
        aria-label={`Verrouillé — inclus dans ${plan}`}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium shadow-sm">
          <Lock className="size-3.5" />
          Inclus dans {plan}
        </span>
      </button>
    </div>
  );
}
