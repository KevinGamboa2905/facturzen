import Link from "next/link";
import { ArrowRight, FileSignature } from "lucide-react";

import type { WorkspaceData } from "@/lib/workspace";
import { computeTotals } from "@/lib/totals";
import { formatAmount } from "@/lib/money";
import { QuoteStatusBadge } from "@/components/app/status-badge";
import { NewDocumentButton } from "@/components/app/new-document-button";
import { ConvertQuoteButton } from "@/components/app/convert-quote-button";
import { ListToolbar, NoResults, type SortOption } from "@/components/app/list-toolbar";
import type { QuoteStatus } from "@/lib/status";

const SORTS: SortOption[] = [
  { value: "date", label: "Date" },
  { value: "amount", label: "Montant" },
  { value: "status", label: "Statut" },
];

// Shared quotes list for /app and /demo.
export function QuotesView({
  basePath,
  quotes,
  invoices,
  statut,
  q = "",
  sort = "date",
}: {
  basePath: string;
  quotes: WorkspaceData["quotes"];
  invoices: WorkspaceData["invoices"];
  statut?: string;
  q?: string;
  sort?: string;
}) {
  const invoiceNumberById = new Map(invoices.map((i) => [i.id, i.number]));
  const query = q.trim().toLowerCase();
  let list = quotes;
  if (statut === "accepted") {
    list = list.filter((q) => q.status === "ACCEPTED" && !q.convertedInvoiceId);
  }
  if (query) {
    list = list.filter(
      (qt) =>
        qt.number.toLowerCase().includes(query) ||
        (qt.client?.name ?? "").toLowerCase().includes(query) ||
        qt.lineItems.some((li) => li.label.toLowerCase().includes(query)),
    );
  }
  list = [...list].sort((a, b) => {
    if (sort === "amount") return computeTotals(b.lineItems).ttc - computeTotals(a.lineItems).ttc;
    if (sort === "status") return a.status.localeCompare(b.status);
    return b.issueDate.getTime() - a.issueDate.getTime();
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Devis</h1>
        <NewDocumentButton kind="DEV" basePath={basePath} label="Nouveau devis" />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Un devis accepté devient une facture en un clic.
      </p>

      {quotes.length > 0 && (
        <div className="mt-4">
          <ListToolbar sortOptions={SORTS} placeholder="Rechercher (n°, client, prestation)…" defaultSort="date" />
        </div>
      )}

      {quotes.length === 0 ? (
        <div className="mt-5 flex flex-col items-center rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
            <FileSignature className="size-5" />
          </span>
          <p className="mt-4 text-sm font-medium">Aucun devis pour l&apos;instant</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Envoyez un devis à votre client — un clic suffit ensuite pour le transformer en facture.
          </p>
          <div className="mt-5">
            <NewDocumentButton kind="DEV" basePath={basePath} label="Créer un devis" />
          </div>
        </div>
      ) : list.length === 0 && query ? (
        <NoResults query={q.trim()} />
      ) : (
        <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {list.map((q) => {
              const readyToInvoice = q.status === "ACCEPTED" && !q.convertedInvoiceId;
              const convertedNumber = q.convertedInvoiceId ? invoiceNumberById.get(q.convertedInvoiceId) : null;
              return (
                <li key={q.id} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40">
                  <Link href={`${basePath}/devis/${q.id}`} prefetch className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{q.client?.name ?? "Sans client"}</p>
                      <p className="truncate text-xs text-muted-foreground tabular-nums">{q.number}</p>
                    </div>
                    {readyToInvoice ? (
                      <QuoteStatusBadge status="ACCEPTED" label="Prêt à facturer" pulse className="bg-success/15 text-success" />
                    ) : (
                      <QuoteStatusBadge status={q.status as QuoteStatus} />
                    )}
                  </Link>

                  {readyToInvoice && <ConvertQuoteButton quoteId={q.id} basePath={basePath} />}
                  {convertedNumber && q.convertedInvoiceId && (
                    <Link
                      href={`${basePath}/factures/${q.convertedInvoiceId}`}
                      prefetch
                      className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-info transition-colors hover:text-info/80"
                    >
                      Converti en {convertedNumber}
                      <ArrowRight className="size-3.5" />
                    </Link>
                  )}

                  <span className="w-28 shrink-0 text-right text-sm font-medium tabular-nums">
                    {formatAmount(computeTotals(q.lineItems).ttc)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
