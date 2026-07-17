"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, PenLine } from "lucide-react";

import { acceptQuote, declineQuote } from "@/app/actions/public";

export function QuoteActions({ token, studio }: { token: string; studio: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  function accept() {
    if (!name.trim()) return setError("Veuillez saisir votre nom pour signer.");
    if (!agreed) return setError("Veuillez cocher « J'accepte ce devis ».");
    start(async () => {
      const res = await acceptQuote(token, name);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Une erreur est survenue.");
    });
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900">
        <PenLine className="size-4" /> Accepter ce devis
      </h2>
      <p className="mt-1 text-sm text-neutral-500">
        Signez électroniquement pour valider la commande auprès de {studio}.
      </p>

      <label htmlFor="sig" className="mt-4 block text-sm font-medium text-neutral-700">
        Votre nom complet
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

      <label className="mt-3 flex items-start gap-2.5 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => {
            setAgreed(e.target.checked);
            setError(null);
          }}
          className="mt-0.5 size-4 rounded border-neutral-300"
        />
        <span>J&apos;accepte ce devis et ses conditions.</span>
      </label>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          disabled={pending}
          onClick={accept}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-semibold text-white transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Signer et accepter
        </button>
        {!declining && (
          <button
            onClick={() => setDeclining(true)}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-neutral-300 px-4 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
          >
            Refuser
          </button>
        )}
      </div>

      {declining && (
        <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <label htmlFor="reason" className="block text-sm font-medium text-neutral-700">
            Refuser ce devis — raison (optionnel)
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Ex : budget, délai, projet reporté…"
            className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setDeclining(false)}
              className="h-10 flex-1 rounded-lg border border-neutral-300 text-sm font-medium text-neutral-600 hover:bg-white"
            >
              Retour
            </button>
            <button
              disabled={pending}
              onClick={() => start(async () => { await declineQuote(token, reason); router.refresh(); })}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-red-300 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirmer le refus
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
