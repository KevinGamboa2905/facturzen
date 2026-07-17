"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { LiquidGlassButton } from "@/components/ui/liquid-glass";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { PlanCards } from "@/components/app/plan-cards";
import { useUpgrade } from "@/components/app/upgrade-modal";
import { type PlanId } from "@/lib/plans";
import { changePlan } from "@/app/actions/billing";
import { dismissPlanNudge } from "@/app/actions/onboarding";

// Free-plan monthly send gauge, integrated near the stat cards. Turns `--warning`
// when the quota is reached; the whole strip opens the upgrade modal at the cap.
export function PlanUsageBar({
  sentThisMonth,
  invoiceLimit,
  monthLabel,
}: {
  sentThisMonth: number;
  invoiceLimit: number;
  monthLabel: string;
}) {
  const { open } = useUpgrade();
  const atCap = sentThisMonth >= invoiceLimit;
  const pct = Math.min(100, Math.round((sentThisMonth / invoiceLimit) * 100));

  return (
    <button
      type="button"
      onClick={() =>
        atCap
          ? open(`Vous avez envoyé vos ${invoiceLimit} factures gratuites de ${monthLabel}.`)
          : undefined
      }
      className="w-full rounded-xl border border-border bg-card p-4 text-left"
    >
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Factures envoyées ce mois</span>
        <span className={`tabular-nums ${atCap ? "font-semibold text-warning" : "text-muted-foreground"}`}>
          {sentThisMonth}/{invoiceLimit}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${atCap ? "bg-warning" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {atCap && (
        <p className="mt-2 text-xs text-warning">
          Limite atteinte — passez à Indépendant pour des factures illimitées.
        </p>
      )}
    </button>
  );
}

// One-time "choose your plan" nudge for users onboarded before the plan step.
export function ChoosePlanNudge() {
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [target, setTarget] = useState<PlanId>("INDEP");
  const [pending, start] = useTransition();

  if (hidden) return null;

  function dismiss() {
    setHidden(true);
    start(async () => {
      await dismissPlanNudge();
    });
  }

  function confirm() {
    start(async () => {
      await changePlan(target);
      await dismissPlanNudge();
      setOpen(false);
      setHidden(true);
      toast("Plan enregistré ✓");
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4">
        <div>
          <p className="text-sm font-medium">Choisissez votre plan</p>
          <p className="text-xs text-muted-foreground">
            Restez sur Libre ou testez tout pendant 14 jours — sans carte bancaire.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LiquidGlassButton onClick={() => setOpen(true)} className="h-9 rounded-xl px-4 text-sm">
            Voir les plans
          </LiquidGlassButton>
          <button
            type="button"
            aria-label="Masquer"
            onClick={dismiss}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {open && (
        <Modal open onClose={() => setOpen(false)} title="Choisissez votre plan">
          <PlanCards selected={target} onSelect={setTarget} compact />
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Sans carte bancaire. Changez de plan à tout moment.
          </p>
          <LiquidGlassButton onClick={confirm} disabled={pending} className="mt-4 h-11 w-full rounded-xl text-sm">
            {pending ? "…" : `Choisir ${target === "FREE" ? "Libre" : target === "INDEP" ? "Indépendant" : "Studio"}`}
          </LiquidGlassButton>
        </Modal>
      )}
    </>
  );
}
