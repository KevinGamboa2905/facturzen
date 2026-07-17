"use client";

import { createContext, useCallback, useContext, useState } from "react";
import Link from "next/link";
import { Check, Minus } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { PLAN_ORDER, PLANS, type Feature } from "@/lib/plans";

type UpgradeCtx = { open: (reason?: string) => void };
const Ctx = createContext<UpgradeCtx>({ open: () => {} });

export function useUpgrade() {
  return useContext(Ctx);
}

// Wraps the app so any locked control can call useUpgrade().open(reason).
export function UpgradeProvider({ children }: { children: React.ReactNode }) {
  const [reason, setReason] = useState<string | null>(null);
  const open = useCallback((r?: string) => setReason(r ?? ""), []);
  return (
    <Ctx.Provider value={{ open }}>
      {children}
      <UpgradeModal reason={reason} onClose={() => setReason(null)} />
    </Ctx.Provider>
  );
}

const COMPARE: { label: string; feature?: Feature }[] = [
  { label: "Factures / mois", feature: undefined },
  { label: "Relances automatiques", feature: "reminders" },
  { label: "Logo sur les documents", feature: "branding" },
  { label: "Signature de devis en ligne", feature: "onlineSignature" },
  { label: "Acomptes", feature: "deposits" },
  { label: "Paiement en ligne (Stripe)", feature: "onlinePayment" },
  { label: "Export comptable (CSV)", feature: "csvExport" },
];

function UpgradeModal({ reason, onClose }: { reason: string | null; onClose: () => void }) {
  if (reason === null) return null;

  return (
    <Modal open onClose={onClose} title="Passez à la vitesse supérieure">
      {reason && <p className="text-sm text-muted-foreground">{reason}</p>}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-1/2" />
              {PLAN_ORDER.map((id) => (
                <th key={id} className="px-2 pb-2 text-center text-xs font-semibold">
                  {PLANS[id].name}
                  <div className="font-normal text-muted-foreground tabular-nums">
                    {PLANS[id].price} CHF
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARE.map((row) => (
              <tr key={row.label} className="border-t border-border">
                <td className="py-2 pr-2 text-muted-foreground">{row.label}</td>
                {PLAN_ORDER.map((id) => {
                  const val = row.feature
                    ? PLANS[id].features[row.feature]
                    : PLANS[id].quotas.invoicesPerMonth === Infinity;
                  const cell = !row.feature
                    ? PLANS[id].quotas.invoicesPerMonth === Infinity
                      ? "Illimité"
                      : String(PLANS[id].quotas.invoicesPerMonth)
                    : null;
                  return (
                    <td key={id} className="px-2 py-2 text-center">
                      {cell ?? (val ? (
                        <Check className="mx-auto size-4 text-success" />
                      ) : (
                        <Minus className="mx-auto size-4 text-muted-foreground/50" />
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/app/reglages?tab=abonnement"
          onClick={onClose}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
        >
          Passer à Indépendant
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="h-11 rounded-xl border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Plus tard
        </button>
      </div>
    </Modal>
  );
}
