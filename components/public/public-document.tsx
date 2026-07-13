import { computeTotals } from "@/lib/totals";
import { formatAmount } from "@/lib/money";

type Line = { label: string; description: string | null; quantity: number; unitPrice: number; vatRate: number };

const fmtDate = (d?: Date | null) => (d ? new Intl.DateTimeFormat("fr-CH").format(d) : "—");

// Light, print-like rendering of the document (what the client sees on /d and /f).
export function PublicDocument({
  kind,
  number,
  company,
  client,
  lineItems,
  issueDate,
  dueDate,
  validUntil,
  currency,
  depositPercent,
}: {
  kind: "FAC" | "DEV";
  number: string;
  company: { name: string; address?: string | null; zip?: string | null; city?: string | null; vatNumber?: string | null };
  client: { name: string; address?: string | null; zip?: string | null; city?: string | null } | null;
  lineItems: Line[];
  issueDate: Date;
  dueDate?: Date | null;
  validUntil?: Date | null;
  currency: string;
  depositPercent?: number | null;
}) {
  const isInvoice = kind === "FAC";
  const cur = currency as "CHF" | "EUR";
  const totals = computeTotals(lineItems, depositPercent);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-neutral-900 shadow-sm sm:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold">{company.name}</p>
          {(company.address || company.city) && (
            <p className="mt-0.5 text-sm text-neutral-500">
              {[company.address, [company.zip, company.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xl font-bold uppercase tracking-wide">{isInvoice ? "Facture" : "Devis"}</p>
          <p className="mt-0.5 text-sm text-neutral-500 tabular-nums">{number}</p>
          <p className="text-sm text-neutral-500 tabular-nums">Date : {fmtDate(issueDate)}</p>
          <p className="text-sm text-neutral-500 tabular-nums">
            {isInvoice ? `Échéance : ${fmtDate(dueDate)}` : `Valable jusqu'au : ${fmtDate(validUntil)}`}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <p className="text-xs uppercase tracking-wide text-neutral-400">Adressé à</p>
        <p className="mt-1 font-medium">{client?.name ?? "—"}</p>
        {client && (client.address || client.city) && (
          <p className="text-sm text-neutral-500">
            {[client.address, [client.zip, client.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
          </p>
        )}
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs uppercase text-neutral-400">
              <th className="py-2 text-left font-medium">Désignation</th>
              <th className="py-2 text-right font-medium">Qté</th>
              <th className="py-2 text-right font-medium">Prix HT</th>
              <th className="py-2 text-right font-medium">TVA</th>
              <th className="py-2 text-right font-medium">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((l, i) => (
              <tr key={i} className="border-b border-neutral-100 align-top">
                <td className="py-2.5 pr-3">
                  <span className="font-medium">{l.label}</span>
                  {l.description && <span className="block text-xs text-neutral-400">{l.description}</span>}
                </td>
                <td className="py-2.5 text-right tabular-nums">{l.quantity}</td>
                <td className="py-2.5 text-right tabular-nums">{formatAmount(l.unitPrice, cur)}</td>
                <td className="py-2.5 text-right tabular-nums">{l.vatRate}%</td>
                <td className="py-2.5 text-right font-medium tabular-nums">
                  {formatAmount(Math.round(l.quantity * l.unitPrice), cur)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end">
        <dl className="w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between text-neutral-500">
            <dt>Total HT</dt>
            <dd className="tabular-nums">{formatAmount(totals.ht, cur)}</dd>
          </div>
          {totals.vatByRate.map((v) => (
            <div key={v.rate} className="flex justify-between text-neutral-500">
              <dt>TVA {v.rate}%</dt>
              <dd className="tabular-nums">{formatAmount(v.amount, cur)}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-neutral-200 pt-1.5 text-base font-semibold">
            <dt>Total TTC</dt>
            <dd className="tabular-nums">{formatAmount(totals.ttc, cur)}</dd>
          </div>
        </dl>
      </div>

      {depositPercent && totals.deposit > 0 ? (
        <div className="mt-4 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600">
          Acompte à la commande ({depositPercent}%) :{" "}
          <span className="font-medium text-neutral-900">{formatAmount(totals.deposit, cur)}</span> — Solde à la
          livraison : <span className="font-medium text-neutral-900">{formatAmount(totals.ttc - totals.deposit, cur)}</span>
        </div>
      ) : null}

      {company.vatNumber && <p className="mt-6 text-xs text-neutral-400">N° TVA : {company.vatNumber}</p>}
    </div>
  );
}
