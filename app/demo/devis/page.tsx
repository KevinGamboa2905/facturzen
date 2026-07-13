import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ensureDemoWorkspace, getDemoData } from "@/lib/demo/session";
import { computeTotals } from "@/lib/totals";
import { formatAmount } from "@/lib/money";
import { QuoteStatusBadge } from "@/components/app/status-badge";
import { NewDocumentButton } from "@/components/app/new-document-button";
import { ConvertQuoteButton } from "@/components/app/convert-quote-button";
import type { QuoteStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function DemoQuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const { statut } = await searchParams;
  const user = await ensureDemoWorkspace();
  const data = user ? await getDemoData(user.id) : null;
  if (!data) return null;

  const invoiceNumberById = new Map(data.invoices.map((i) => [i.id, i.number]));
  let quotes = data.quotes;
  if (statut === "accepted") {
    quotes = quotes.filter((q) => q.status === "ACCEPTED" && !q.convertedInvoiceId);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Devis</h1>
        <NewDocumentButton kind="DEV" basePath="/demo" label="Nouveau devis" />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Un devis accepté devient une facture en un clic.
      </p>

      <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card">
        <ul className="divide-y divide-border">
          {quotes.map((q) => {
            const readyToInvoice = q.status === "ACCEPTED" && !q.convertedInvoiceId;
            const convertedNumber = q.convertedInvoiceId ? invoiceNumberById.get(q.convertedInvoiceId) : null;
            return (
              <li key={q.id} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40">
                <Link href={`/demo/devis/${q.id}`} prefetch className="flex min-w-0 flex-1 items-center gap-3">
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

                {readyToInvoice && <ConvertQuoteButton quoteId={q.id} basePath="/demo" />}
                {convertedNumber && q.convertedInvoiceId && (
                  <Link
                    href={`/demo/factures/${q.convertedInvoiceId}`}
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
    </div>
  );
}
