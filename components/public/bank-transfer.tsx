"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

function Row({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="flex items-center gap-2 text-right">
        <span className="tabular-nums text-neutral-800">{value}</span>
        <button
          type="button"
          aria-label={`Copier ${label}`}
          onClick={() => {
            navigator.clipboard?.writeText(value).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="grid size-7 shrink-0 place-items-center rounded-md border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-800"
        >
          {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
        </button>
      </dd>
    </div>
  );
}

// Bank-transfer coordinates with copy buttons (§3). The QR slip itself lives in
// the PDF — we point the client there.
export function BankTransferDetails({
  holder,
  iban,
  reference,
  amount,
  isCHF,
}: {
  holder?: string | null;
  iban: string;
  reference: string;
  amount: string;
  isCHF: boolean;
}) {
  return (
    <div>
      <dl className="mt-2 text-sm">
        {holder && <Row label="Titulaire" value={holder} />}
        <Row label="IBAN" value={iban} />
        <Row label="Référence" value={reference} />
        <Row label="Montant" value={amount} />
      </dl>
      {isCHF && (
        <p className="mt-3 text-xs text-neutral-500">
          💡 Le bulletin QR à scanner avec votre app bancaire se trouve dans le PDF.
        </p>
      )}
    </div>
  );
}
