"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

import { createBalanceInvoice } from "@/app/actions/documents";
import { useToast } from "@/components/ui/toast";
import { LiquidGlassButton } from "@/components/ui/liquid-glass";

// Compact "Facturer le solde" action shown directly in an "Acompte payé" row.
export function FacturerSoldeButton({ invoiceId, basePath }: { invoiceId: string; basePath: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();

  return (
    <LiquidGlassButton
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await createBalanceInvoice(invoiceId);
          if (res.ok && res.id) {
            toast("Facture de solde créée ✓");
            router.push(`${basePath}/factures/${res.id}?nouvelle=1`);
          } else toast("Impossible de facturer le solde.", "error");
        })
      }
      className="h-8 shrink-0 rounded-lg px-2.5 text-xs"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowRight className="size-3.5" />}
      Facturer le solde
    </LiquidGlassButton>
  );
}
