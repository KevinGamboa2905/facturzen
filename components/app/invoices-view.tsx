import Link from "next/link";
import { FileText } from "lucide-react";

import type { WorkspaceData } from "@/lib/workspace";
import { computeTotals } from "@/lib/totals";
import { getInvoiceDisplayStatus } from "@/lib/app/invoice-status";
import { formatAmount, formatAmountPlain } from "@/lib/money";
import { DisplayInvoiceBadge } from "@/components/app/status-badge";
import { NewDocumentButton } from "@/components/app/new-document-button";
import { FacturerSoldeButton } from "@/components/app/facturer-solde-button";
import { ListToolbar, NoResults, type SortOption } from "@/components/app/list-toolbar";

const FILTERS: { value: string; label: string; keys?: string[] }[] = [
  { value: "all", label: "Toutes" },
  { value: "paid", label: "Payées", keys: ["PAID"] },
  { value: "acompte", label: "Acompte payé", keys: ["DEPOSIT_PAID", "DEPOSIT_PAID_BALANCE"] },
  { value: "sent", label: "En attente", keys: ["SENT"] },
  { value: "overdue", label: "En retard", keys: ["OVERDUE"] },
];

const SORTS: SortOption[] = [
  { value: "date", label: "Date" },
  { value: "amount", label: "Montant" },
  { value: "status", label: "Statut" },
];

// Shared invoices list for /app and /demo — only basePath and the data differ.
export function InvoicesView({
  basePath,
  invoices,
  statut = "all",
  q = "",
  sort = "date",
}: {
  basePath: string;
  invoices: WorkspaceData["invoices"];
  statut?: string;
  q?: string;
  sort?: string;
}) {
  const active = FILTERS.find((f) => f.value === statut) ?? FILTERS[0];
  const query = q.trim().toLowerCase();

  let rows = invoices.map((inv) => {
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
  if (active.keys) rows = rows.filter((r) => active.keys!.includes(r.ds.key));
  if (query) {
    rows = rows.filter(
      (r) =>
        r.inv.number.toLowerCase().includes(query) ||
        (r.inv.client?.name ?? "").toLowerCase().includes(query) ||
        r.inv.lineItems.some((li) => li.label.toLowerCase().includes(query)),
    );
  }
  rows.sort((a, b) => {
    if (sort === "amount") return b.total - a.total;
    if (sort === "status") return a.ds.key.localeCompare(b.ds.key);
    return b.inv.issueDate.getTime() - a.inv.issueDate.getTime();
  });
  const visible = rows;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Factures</h1>
        <NewDocumentButton kind="FAC" basePath={basePath} label="Nouvelle facture" />
      </div>

      {invoices.length > 0 && (
        <div className="mt-5">
          <ListToolbar sortOptions={SORTS} placeholder="Rechercher (n°, client, prestation)…" defaultSort="date" />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "all" ? `${basePath}/factures` : `${basePath}/factures?statut=${f.value}`}
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

      {invoices.length === 0 ? (
        <EmptyInvoices basePath={basePath} />
      ) : visible.length === 0 && query ? (
        <NoResults query={q.trim()} />
      ) : (
        <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {visible.map(({ inv, total, ds }) => {
              const cur = inv.currency as "CHF" | "EUR";
              const partial = ds.key === "DEPOSIT_PAID" || ds.key === "DEPOSIT_PAID_BALANCE";
              const showSolde = ds.key === "DEPOSIT_PAID";
              return (
                <li key={inv.id} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40">
                  <Link href={`${basePath}/factures/${inv.id}`} prefetch className="flex min-w-0 flex-1 items-center gap-3">
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
                  {showSolde && <FacturerSoldeButton invoiceId={inv.id} basePath={basePath} />}
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
      )}
    </div>
  );
}

function EmptyInvoices({ basePath }: { basePath: string }) {
  return (
    <div className="mt-5 flex flex-col items-center rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
        <FileText className="size-5" />
      </span>
      <p className="mt-4 text-sm font-medium">Aucune facture pour l&apos;instant</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Créez votre première facture — vous pourrez y ajouter vos prestations en un clic.
      </p>
      <div className="mt-5">
        <NewDocumentButton kind="FAC" basePath={basePath} label="Créer une facture" />
      </div>
    </div>
  );
}
