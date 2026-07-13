"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

import { convertQuoteToInvoice } from "@/app/actions/documents";
import { useToast } from "@/components/ui/toast";
import { LiquidGlassButton } from "@/components/ui/liquid-glass";

// "Convertir en facture" shown directly in an accepted quote row (§1).
export function ConvertQuoteButton({ quoteId, basePath }: { quoteId: string; basePath: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();

  return (
    <LiquidGlassButton
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await convertQuoteToInvoice(quoteId);
          if (res.ok && res.id) {
            toast("Facture créée depuis le devis ✓");
            router.push(`${basePath}/factures/${res.id}?nouvelle=1`);
          } else toast("Conversion impossible.", "error");
        })
      }
      className="h-8 shrink-0 rounded-lg px-2.5 text-xs"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowRight className="size-3.5" />}
      Convertir en facture
    </LiquidGlassButton>
  );
}
