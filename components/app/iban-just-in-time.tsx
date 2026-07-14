"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, QrCode } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { LiquidGlassButton } from "@/components/ui/liquid-glass";
import { useToast } from "@/components/ui/toast";
import { saveIban } from "@/app/actions/settings";

const DISMISS_KEY = "fz-iban-jit-dismissed";

// Just-in-time QR-IBAN prompt (prompt 2 §2b). Appears the first time a CHF
// invoice is built without an IBAN. Dismissible for the session so it never nags.
export function IbanJustInTime() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [iban, setIban] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    // Sync to a browser API (sessionStorage) on mount — intentionally a one-shot
    // open decision, not reactive state.
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
  }, []);

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  }

  function submit() {
    setError(null);
    start(async () => {
      const res = await saveIban(iban);
      if (res.ok) {
        sessionStorage.setItem(DISMISS_KEY, "1");
        setOpen(false);
        toast("QR-IBAN enregistré ✓");
        router.refresh();
      } else {
        setError(res.error ?? "Une erreur est survenue.");
      }
    });
  }

  if (!open) return null;

  return (
    <Modal open onClose={dismiss} title="Ajoutez votre QR-IBAN">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <QrCode className="size-5" />
        </span>
        <p className="text-sm text-muted-foreground">
          Pour générer la QR-facture suisse de cette facture en CHF, FacturZen a besoin de votre
          QR-IBAN. Ajoutez-le maintenant — une seule fois.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-4 space-y-3"
      >
        <Input
          autoFocus
          value={iban}
          onChange={(e) => setIban(e.target.value)}
          placeholder="CH.. .... .... .... .... ."
          className="h-11 tabular-nums"
          aria-label="QR-IBAN"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="h-11 flex-1 rounded-xl border border-border text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Plus tard
          </button>
          <LiquidGlassButton type="submit" disabled={pending} className="h-11 flex-1 rounded-xl text-sm">
            {pending && <Loader2 className="size-4 animate-spin" />}
            Enregistrer
          </LiquidGlassButton>
        </div>
      </form>
    </Modal>
  );
}
