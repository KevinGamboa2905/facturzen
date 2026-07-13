import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { computeTotals } from "@/lib/totals";
import { PublicDocument } from "@/components/public/public-document";
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

        <p className="mt-6 text-center text-xs text-neutral-400">Propulsé par FacturZen</p>
      </div>
    </div>
  );
}
