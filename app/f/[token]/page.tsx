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
import { BankTransferDetails } from "@/components/public/bank-transfer";
import { DisplayInvoiceBadge } from "@/components/app/status-badge";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const fmtDate = (d?: Date | null) => (d ? new Intl.DateTimeFormat("fr-CH").format(d) : "");

export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paiement?: string }>;
}) {
  const { token } = await params;
  const { paiement } = await searchParams;
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
  const isPaid = inv.status === "PAID";
  const canPayOnline = Boolean(u.stripeAccountId) && can(u, "onlinePayment") && outstanding > 0 && !isPaid;
  const showBank = u.showBankDetails && Boolean(u.iban);
  const currency = inv.currency as "CHF" | "EUR";

  return (
    <div className="min-h-dvh bg-neutral-100 px-4 py-8 sm:py-14">
      <div className="mx-auto w-full max-w-2xl">
        {u.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={u.logoUrl} alt={u.companyName ?? "Émetteur"} className="mb-4 h-9 w-auto" />
        )}

        {paiement === "ok" && !isPaid && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Merci ! Votre paiement est en cours de confirmation — cette page se mettra à jour d'ici quelques instants.
          </div>
        )}
        {isPaid && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            ✓ Facture payée{inv.paidAt ? ` le ${fmtDate(inv.paidAt)}` : ""}. Merci !
          </div>
        )}

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

        {/* Payment methods — online payment primary, bank transfer below (§3). */}
        {(canPayOnline || showBank) && !isPaid && (
          <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-neutral-800">Payer cette facture</h2>
            {canPayOnline && (
              <div className="mt-3">
                <PayOnlineButton token={token} amountLabel={formatAmount(outstanding, currency)} />
              </div>
            )}
            {showBank && (
              <div className={canPayOnline ? "mt-4 border-t border-neutral-200 pt-4" : "mt-3"}>
                <p className="text-xs font-medium text-neutral-500">
                  {canPayOnline ? "Ou par virement bancaire" : "Par virement bancaire"}
                </p>
                <BankTransferDetails
                  holder={u.accountHolder}
                  iban={u.iban ?? ""}
                  reference={inv.number}
                  amount={formatAmount(outstanding, currency)}
                  isCHF={currency === "CHF"}
                />
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
