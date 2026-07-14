"use client";

import { Check } from "lucide-react";

import { PLANS, PLAN_ORDER, type PlanId } from "@/lib/plans";

// Reusable 3-plan selector (onboarding step 3, the "choose a plan" nudge, and the
// upgrade modal). Same visual hierarchy as the landing: Indépendant recommended.
export function PlanCards({
  selected,
  onSelect,
  compact = false,
}: {
  selected: PlanId;
  onSelect: (id: PlanId) => void;
  compact?: boolean;
}) {
  return (
    <div className={`grid gap-3 ${compact ? "sm:grid-cols-3" : "md:grid-cols-3"}`}>
      {PLAN_ORDER.map((id) => {
        const plan = PLANS[id];
        const isSelected = selected === id;
        return (
          <button
            type="button"
            key={id}
            onClick={() => onSelect(id)}
            aria-pressed={isSelected}
            className={`relative flex flex-col rounded-2xl border p-4 text-left transition-colors ${
              isSelected
                ? "border-accent ring-2 ring-accent"
                : "border-border hover:border-muted-foreground/40"
            } ${plan.recommended && !compact ? "md:-my-1 md:shadow-sm" : ""}`}
          >
            {plan.recommended && (
              <span className="absolute -top-2 right-3 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
                Recommandé
              </span>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{plan.name}</span>
              <span
                className={`grid size-5 place-items-center rounded-full border ${
                  isSelected ? "border-transparent bg-accent text-accent-foreground" : "border-border text-transparent"
                }`}
              >
                <Check className="size-3" />
              </span>
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {plan.price}
              <span className="text-sm font-normal text-muted-foreground"> CHF/mois</span>
            </p>
            {!compact && <p className="mt-0.5 text-xs text-muted-foreground">{plan.tagline}</p>}
            <ul className="mt-3 space-y-1.5">
              {plan.benefits.slice(0, 4).map((b) => (
                <li key={b} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Check className="mt-0.5 size-3 shrink-0 text-success" />
                  {b}
                </li>
              ))}
            </ul>
          </button>
        );
      })}
    </div>
  );
}
