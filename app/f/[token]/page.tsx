import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { computeTotals } from "@/lib/totals";
import { formatAmount } from "@/lib/money";
import { can } from "@/lib/plans";
import { recordViewOncePerDay } from "@/lib/app/events";
import { PublicDocument } from "@/components/public/public-document";
import { PayOnlineButton } from "@/components/public/pay-online-button";
import { DisplayInvoiceBadge } from "@/components/app/status-badge";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: { lineItems: { orderBy: { position: "asc" } }, client: true, user: true, balances: { select: { id: true } } },
  });
  if (!inv) notFound();
  const u = inv.user;

  // Record "vu par le client" — at most once per day per document (§2).
  await recordViewOncePerDay({ invoiceId: inv.id });

  const total = computeTotals(inv.lineItems).ttc;
  const outstanding = total - inv.amountPaid;
  const canPayOnline =
    Boolean(u.stripeAccountId) && can(u, "onlinePayment") && outstanding > 0 && inv.status !== "PAID";
  const showBank = u.showBankDetails && Boolean(u.iban);
  const currency = inv.currency as "CHF" | "EUR";

  return (
    <div className="min-h-dvh bg-neutral-100 px-4 py-8 sm:py-14">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-neutral-600 tabular-nums">Facture {inv.number}</span>
            <DisplayInvoiceBadge
              invoice={{
                status: inv.status,
                amountPaid: inv.amountPaid,
                total: computeTotals(inv.lineItems).ttc,
                depositPercent: inv.depositPercent,
                dueDate: inv.dueDate,
                hasBalanceInvoice: inv.balances.length > 0,
              }}
            />

          </div>
          <a
            href={`/api/pdf/public/facture/${token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Download className="size-4" />
            Télécharger le PDF
          </a>
        </div>

        <PublicDocument
          kind="FAC"
          number={inv.number}
          company={{ name: u.companyName || "Entreprise", address: u.address, zip: u.zip, city: u.city, vatNumber: u.vatNumber }}
          client={inv.client}
          lineItems={inv.lineItems}
          issueDate={inv.issueDate}
          dueDate={inv.dueDate}
          currency={inv.currency}
        />

        {/* Payment methods — online payment primary, bank details below (§6). */}
        {(canPayOnline || showBank) && inv.status !== "PAID" && (
          <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-neutral-800">Régler cette facture</h2>
            {canPayOnline && (
              <div className="mt-3">
                <PayOnlineButton token={token} amountLabel={formatAmount(outstanding, currency)} />
              </div>
            )}
            {showBank && (
              <div className={canPayOnline ? "mt-4 border-t border-neutral-200 pt-4" : "mt-3"}>
                <p className="text-xs font-medium text-neutral-500">
                  {canPayOnline ? "Ou par virement bancaire" : "Coordonnées de paiement"}
                </p>
                <dl className="mt-2 space-y-1 text-sm text-neutral-700">
                  {u.accountHolder && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-neutral-500">Titulaire</dt>
                      <dd className="text-right">{u.accountHolder}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">IBAN</dt>
                    <dd className="text-right tabular-nums">{u.iban}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        )}

        {!can(u, "removeBranding") && (
          <p className="mt-6 text-center text-xs text-neutral-400">Propulsé par Facty</p>
        )}
      </div>
    </div>
  );
}
