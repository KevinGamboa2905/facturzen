"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, PenLine } from "lucide-react";

import { acceptQuote, declineQuote } from "@/app/actions/public";

export function QuoteActions({ token }: { token: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900">
        <PenLine className="size-4" /> Accepter ce devis
      </h2>
      <p className="mt-1 text-sm text-neutral-500">
        Tapez votre nom pour signer électroniquement et valider la commande.
      </p>

      <label htmlFor="sig" className="mt-4 block text-sm font-medium text-neutral-700">
        Votre nom
      </label>
      <input
        id="sig"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
        placeholder="Prénom Nom"
        className="mt-1.5 h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-neutral-900 outline-none focus:border-neutral-900"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await acceptQuote(token, name);
              if (res.ok) router.refresh();
              else setError(res.error ?? "Une erreur est survenue.");
            })
          }
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-semibold text-white transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Accepter et signer
        </button>
        {confirmDecline ? (
          <button
            disabled={pending}
            onClick={() => start(async () => { await declineQuote(token); router.refresh(); })}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-red-300 px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            Confirmer le refus
          </button>
        ) : (
          <button
            onClick={() => setConfirmDecline(true)}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-neutral-300 px-4 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
          >
            Refuser
          </button>
        )}
      </div>
    </div>
  );
}
