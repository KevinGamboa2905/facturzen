"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export const DEPOSIT_CHOICES = ["none", "30", "40", "50", "custom"] as const;
export type DepositChoice = (typeof DEPOSIT_CHOICES)[number];

const labelFor = (c: DepositChoice) => (c === "none" ? "Aucun" : c === "custom" ? "Personnalisé" : `${c} %`);

// Shared by the devis and facture builders (§2) — segmented control with an
// optional custom percentage. Left/Right arrows move the selection.
export function DepositSelector({
  choice,
  custom,
  onChoice,
  onCustom,
}: {
  choice: DepositChoice;
  custom: string;
  onChoice: (c: DepositChoice) => void;
  onCustom: (v: string) => void;
}) {
  const idx = DEPOSIT_CHOICES.indexOf(choice);
  return (
    <div
      role="radiogroup"
      aria-label="Acompte"
      className="flex flex-wrap items-center gap-2"
      onKeyDown={(e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        const d = e.key === "ArrowRight" ? 1 : -1;
        onChoice(DEPOSIT_CHOICES[(idx + d + DEPOSIT_CHOICES.length) % DEPOSIT_CHOICES.length]);
      }}
    >
      {DEPOSIT_CHOICES.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={choice === c}
          onClick={() => onChoice(c)}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-sm transition-colors",
            choice === c
              ? "border-transparent bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {labelFor(c)}
        </button>
      ))}
      {choice === "custom" && (
        <div className="flex items-center gap-1">
          <Input
            value={custom}
            onChange={(e) => onCustom(e.target.value)}
            inputMode="decimal"
            className="h-9 w-20 text-right tabular-nums"
            aria-label="Pourcentage d'acompte"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      )}
    </div>
  );
}
