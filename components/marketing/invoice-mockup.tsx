import { Check, Plus, QrCode } from "lucide-react";

import { formatAmountPlain } from "@/lib/money";

// Épuré mockup of the invoice builder — pure markup, crisp at any size (§6, no stock photo).
const lines = [
  { label: "Identité visuelle — logo", qty: 1, price: 180000 },
  { label: "Déclinaison papeterie", qty: 1, price: 65000 },
  { label: "Séance de cadrage", qty: 2, price: 22000 },
];

export function InvoiceMockup() {
  const ht = lines.reduce((sum, l) => sum + l.qty * l.price, 0);
  const vat = Math.round(ht * 0.081);
  const ttc = ht + vat;

  return (
    <div
      className="w-full rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"
      role="img"
      aria-label="Aperçu du builder de facture Facty"
    >
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Facture</p>
          <p className="font-semibold tabular-nums">FAC-2026-014</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
          Prête à envoyer
        </span>
      </div>

      {/* Client */}
      <div className="mb-4 rounded-lg bg-muted px-4 py-3">
        <p className="text-xs text-muted-foreground">Client</p>
        <p className="font-medium">Boulangerie Favre &amp; Fils</p>
      </div>

      {/* Lines */}
      <div className="divide-y divide-border rounded-lg border border-border">
        {lines.map((line) => (
          <div
            key={line.label}
            className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
          >
            <span className="min-w-0 truncate">{line.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {line.qty} × {formatAmountPlain(line.price)}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-accent">
          <Plus className="size-4" aria-hidden="true" />
          <span className="font-medium">Ajouter une prestation</span>
        </div>
      </div>

      {/* Totals */}
      <div className="mt-4 space-y-1.5 text-sm">
        <div className="flex justify-between tabular-nums text-muted-foreground">
          <span>Total HT</span>
          <span>{formatAmountPlain(ht)}</span>
        </div>
        <div className="flex justify-between tabular-nums text-muted-foreground">
          <span>TVA 8.1 %</span>
          <span>{formatAmountPlain(vat)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 text-base font-semibold tabular-nums">
          <span>Total TTC</span>
          <span>{formatAmountPlain(ttc)} CHF</span>
        </div>
      </div>

      {/* QR strip */}
      <div className="mt-4 flex items-center gap-3 rounded-lg border border-dashed border-border px-4 py-3">
        <QrCode className="size-8 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-medium">QR-facture générée</p>
          <p className="flex items-center gap-1 text-xs text-success">
            <Check className="size-3.5" aria-hidden="true" />
            QR-IBAN et référence conformes
          </p>
        </div>
      </div>
    </div>
  );
}
