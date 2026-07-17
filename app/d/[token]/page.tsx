import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Download, XCircle } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { can } from "@/lib/plans";
import { recordViewOncePerDay } from "@/lib/app/events";
import { PublicDocument } from "@/components/public/public-document";
import { QuoteActions } from "@/components/public/quote-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const fmtDate = (d?: Date | null) => (d ? new Intl.DateTimeFormat("fr-CH").format(d) : "");

export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const quote = await prisma.quote.findUnique({
    where: { publicToken: token },
    include: { lineItems: { orderBy: { position: "asc" } }, client: true, user: true },
  });
  if (!quote) notFound();
  const u = quote.user;
  await recordViewOncePerDay({ quoteId: quote.id });
  const canAct = ["SENT", "DRAFT", "EXPIRED"].includes(quote.status);
  const studio = u.companyName || "l'émetteur";
  const isExpired = quote.validUntil ? quote.validUntil.getTime() < Date.now() : false;

  return (
    <div className="min-h-dvh bg-neutral-100 px-4 py-8 sm:py-14">
      <div className="mx-auto w-full max-w-2xl">
        {u.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={u.logoUrl} alt={u.companyName ?? "Émetteur"} className="mb-4 h-9 w-auto" />
        )}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium text-neutral-600 tabular-nums">Devis {quote.number}</span>
          <a
            href={`/api/pdf/public/devis/${token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            <Download className="size-4" />
            Télécharger le PDF
          </a>
        </div>

        <PublicDocument
          kind="DEV"
          number={quote.number}
          company={{ name: u.companyName || "Entreprise", address: u.address, zip: u.zip, city: u.city, vatNumber: u.vatNumber }}
          client={quote.client}
          lineItems={quote.lineItems}
          issueDate={quote.issueDate}
          validUntil={quote.validUntil}
          currency={u.defaultCurrency}
          depositPercent={quote.depositPercent}
        />

        <div className="mt-4">
          {quote.status === "ACCEPTED" ? (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
              <CheckCircle2 className="size-5 shrink-0" />
              <p className="text-sm">
                <span className="font-semibold">Devis accepté ✓</span> Signé par {quote.signatureName} le{" "}
                {fmtDate(quote.signedAt)}. {studio} vous recontacte rapidement.
              </p>
            </div>
          ) : quote.status === "DECLINED" ? (
            <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
              <XCircle className="size-5 shrink-0" />
              <p className="text-sm">Ce devis a été refusé.</p>
            </div>
          ) : isExpired ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
              <p className="text-sm">
                <span className="font-semibold">Ce devis a expiré</span> le {fmtDate(quote.validUntil)}. Contactez{" "}
                {studio} pour obtenir une nouvelle proposition.
              </p>
            </div>
          ) : canAct ? (
            <QuoteActions token={token} studio={studio} />
          ) : null}
        </div>

        {!can(u, "removeBranding") && (
          <p className="mt-6 text-center text-xs text-neutral-400">Propulsé par Facty</p>
        )}
      </div>
    </div>
  );
}
