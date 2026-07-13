import Link from "next/link";

import { ensureDemoWorkspace, getDemoData } from "@/lib/demo/session";
import { computeTotals } from "@/lib/totals";
import { getInvoiceDisplayStatus } from "@/lib/app/invoice-status";
import { formatAmount, formatAmountPlain } from "@/lib/money";
import { DisplayInvoiceBadge } from "@/components/app/status-badge";
import { NewDocumentButton } from "@/components/app/new-document-button";
import { FacturerSoldeButton } from "@/components/app/facturer-solde-button";

export const dynamic = "force-dynamic";

const FILTERS: { value: string; label: string; keys?: string[] }[] = [
  { value: "all", label: "Toutes" },
  { value: "paid", label: "Payées", keys: ["PAID"] },
  { value: "acompte", label: "Acompte payé", keys: ["DEPOSIT_PAID", "DEPOSIT_PAID_BALANCE"] },
  { value: "sent", label: "En attente", keys: ["SENT"] },
  { value: "overdue", label: "En retard", keys: ["OVERDUE"] },
];

export default async function DemoInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const { statut = "all" } = await searchParams;
  const user = await ensureDemoWorkspace();
  const data = user ? await getDemoData(user.id) : null;
  if (!data) return null;

  const active = FILTERS.find((f) => f.value === statut) ?? FILTERS[0];

  const rows = data.invoices.map((inv) => {
    const total = computeTotals(inv.lineItems).ttc;
    const ds = getInvoiceDisplayStatus({
      status: inv.status,
      amountPaid: inv.amountPaid,
      total,
      depositPercent: inv.depositPercent,
      dueDate: inv.dueDate,
      hasBalanceInvoice: inv.balances.length > 0,
    });
    return { inv, total, ds };
  });
  const visible = active.keys ? rows.filter((r) => active.keys!.includes(r.ds.key)) : rows;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Factures</h1>
        <NewDocumentButton kind="FAC" basePath="/demo" label="Nouvelle facture" />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "all" ? "/demo/factures" : `/demo/factures?statut=${f.value}`}
            prefetch
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              active.value === f.value
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card">
        <ul className="divide-y divide-border">
          {visible.map(({ inv, total, ds }) => {
            const cur = inv.currency as "CHF" | "EUR";
            const partial = ds.key === "DEPOSIT_PAID" || ds.key === "DEPOSIT_PAID_BALANCE";
            const showSolde = ds.key === "DEPOSIT_PAID"; // acompte in, balance not yet invoiced
            return (
              <li key={inv.id} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40">
                <Link href={`/demo/factures/${inv.id}`} prefetch className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{inv.client?.name ?? "Sans client"}</p>
                    <p className="truncate text-xs text-muted-foreground tabular-nums">
                      {inv.number} · échéance {inv.dueDate.toLocaleDateString("fr-CH")}
                    </p>
                  </div>
                  <DisplayInvoiceBadge
                    invoice={{
                      status: inv.status,
                      amountPaid: inv.amountPaid,
                      total,
                      depositPercent: inv.depositPercent,
                      dueDate: inv.dueDate,
                      hasBalanceInvoice: inv.balances.length > 0,
                    }}
                  />
                </Link>
                {showSolde && <FacturerSoldeButton invoiceId={inv.id} basePath="/demo" />}
                <span className="w-32 shrink-0 text-right text-sm font-medium tabular-nums">
                  {partial ? (
                    <>
                      {formatAmountPlain(inv.amountPaid)} / {formatAmount(total, cur)}
                    </>
                  ) : (
                    formatAmount(total, cur)
                  )}
                </span>
              </li>
            );
          })}
          {visible.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-muted-foreground">
              Aucune facture dans ce filtre pour l&apos;instant.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
