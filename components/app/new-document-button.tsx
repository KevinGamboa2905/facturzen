"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { createDraftInvoice, createDraftQuote, type DocKind } from "@/app/actions/documents";
import { LiquidGlassButton } from "@/components/ui/liquid-glass";

export function NewDocumentButton({
  kind,
  basePath,
  label,
}: {
  kind: DocKind;
  basePath: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <LiquidGlassButton
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = kind === "FAC" ? await createDraftInvoice() : await createDraftQuote();
          if (res.ok && res.id) {
            router.push(`${basePath}/${kind === "FAC" ? "factures" : "devis"}/${res.id}`);
          }
        })
      }
      className="h-10 rounded-xl px-4 text-sm"
    >
      <Plus className="size-4" />
      {pending ? "Création…" : label}
    </LiquidGlassButton>
  );
}
