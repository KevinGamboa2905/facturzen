import Link from "next/link";
import { ArrowLeft, Mail, MapPin } from "lucide-react";

import type { WorkspaceData } from "@/lib/workspace";
import { computeTotals } from "@/lib/totals";
import { invoiceTotalTtc } from "@/lib/app/dashboard";
import { formatAmount } from "@/lib/money";
import { DisplayInvoiceBadge, QuoteStatusBadge } from "@/components/app/status-badge";
import { ClientActions } from "@/components/app/client-actions";
import type { QuoteStatus } from "@/lib/status";

type Client = WorkspaceData["clients"][number];

// Shared client fiche for /app and /demo: identity, total invoiced, doc history.
export function ClientDetailView({
  basePath,
  client,
  invoices,
  quotes,
}: {
  basePath: string;
  client: Client;
  invoices: WorkspaceData["invoices"];
  quotes: WorkspaceData["quotes"];
}) {
  const clientInvoices = invoices.filter((i) => i.clientId === client.id);
  const clientQuotes = quotes.filter((q) => q.clientId === client.id);
  const totalChf = clientInvoices
    .filter((i) => i.currency === "CHF")
    .reduce((sum, i) => sum + invoiceTotalTtc(i), 0);

  // Average payment delay (§7): mean days between issue and payment, over paid
  // invoices. Hidden under 2 paid invoices (not enough signal).
  const paid = clientInvoices.filter((i) => i.status === "PAID" && i.paidAt);
  const avgDelay =
    paid.length >= 2
      ? Math.round(
          paid.reduce((sum, i) => sum + (i.paidAt!.getTime() - i.issueDate.getTime()) / 86_400_000, 0) /
            paid.length,
        )
      : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8">
      <Link
        href={`${basePath}/clients`}
        prefetch
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Clients
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            {client.email && (
              <p className="flex items-center gap-1.5">
                <Mail className="size-3.5" /> {client.email}
              </p>
            )}
            {(client.address || client.city) && (
              <p className="flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                {[client.address, [client.zip, client.city].filter(Boolean).join(" ")]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>
        </div>
        <ClientActions
          basePath={basePath}
          client={{
            id: client.id,
            name: client.name,
            email: client.email,
            address: client.address,
            zip: client.zip,
            city: client.city,
            notes: client.notes,
          }}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">Total facturé (CHF)</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{formatAmount(totalChf)}</p>
        </div>
        {avgDelay != null && (
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs text-muted-foreground">Habitude de paiement</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">Paie à J+{avgDelay}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">en moyenne, sur {paid.length} factures payées</p>
          </div>
        )}
      </div>

      <Section title="Factures" empty="Aucune facture pour ce client.">
        {clientInvoices.map((inv) => {
          const total = computeTotals(inv.lineItems).ttc;
          return (
            <Row
              key={inv.id}
              href={`${basePath}/factures/${inv.id}`}
              number={inv.number}
              amount={formatAmount(total, inv.currency as "CHF" | "EUR")}
              badge={
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
              }
            />
          );
        })}
      </Section>

      <Section title="Devis" empty="Aucun devis pour ce client.">
        {clientQuotes.map((q) => (
          <Row
            key={q.id}
            href={`${basePath}/devis/${q.id}`}
            number={q.number}
            amount={formatAmount(computeTotals(q.lineItems).ttc)}
            badge={<QuoteStatusBadge status={q.status as QuoteStatus} />}
          />
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  const hasItems = items.some(Boolean) && items.length > 0;
  return (
    <section className="mt-6">
      <h2 className="text-sm font-medium">{title}</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
        {hasItems ? (
          <ul className="divide-y divide-border">{children}</ul>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">{empty}</p>
        )}
      </div>
    </section>
  );
}

function Row({
  href,
  number,
  amount,
  badge,
}: {
  href: string;
  number: string;
  amount: string;
  badge: React.ReactNode;
}) {
  return (
    <li>
      <Link href={href} prefetch className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40">
        <span className="min-w-0 flex-1 truncate text-sm font-medium tabular-nums">{number}</span>
        {badge}
        <span className="w-28 shrink-0 text-right text-sm font-medium tabular-nums">{amount}</span>
      </Link>
    </li>
  );
}
