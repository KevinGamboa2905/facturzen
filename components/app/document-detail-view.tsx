"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BellRing, Copy, Download, Loader2, Send } from "lucide-react";

import { formatAmount } from "@/lib/money";
import { LiquidGlassButton } from "@/components/ui/liquid-glass";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { DisplayInvoiceBadge, QuoteStatusBadge } from "@/components/app/status-badge";
import { DocumentTimeline, type TimelineEvent, type ScheduledReminder } from "@/components/app/document-timeline";
import { getInvoiceActions } from "@/lib/app/invoice-actions";
import type { QuoteStatus } from "@/lib/status";
import {
  markFullyPaid,
  markDepositPaid,
  createBalanceInvoice,
  convertQuoteToInvoice,
  remindNow,
  duplicateDocument,
  cancelDocument,
  sendDocument,
} from "@/app/actions/documents";

export type DetailDoc = {
  kind: "FAC" | "DEV";
  id: string;
  number: string;
  status: string;
  currency: "CHF" | "EUR";
  amountPaid: number;
  total: number;
  depositPercent: number | null;
  dueDate: string | null;
  hasBalanceInvoice: boolean;
  convertedInvoiceId: string | null;
  client: { id: string; name: string } | null;
  lineItems: { label: string; description: string | null; quantity: number; unitPrice: number; vatRate: number }[];
};

export function DocumentDetailView({
  basePath,
  doc,
  events,
  scheduled,
}: {
  basePath: string;
  doc: DetailDoc;
  events: TimelineEvent[];
  scheduled: ScheduledReminder[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const isInvoice = doc.kind === "FAC";
  // Single source of truth for invoice action availability (§1).
  const A = getInvoiceActions({
    status: doc.status,
    amountPaid: doc.amountPaid,
    total: doc.total,
    depositPercent: doc.depositPercent,
    dueDate: doc.dueDate,
    hasBalanceInvoice: doc.hasBalanceInvoice,
  });
  const paid = A.paid;
  const pdfBase = isInvoice ? "facture" : "devis";
  const pdfHref = `/api/pdf/${pdfBase}/${doc.id}`;

  function run(fn: () => Promise<{ ok: boolean }>, msg: string, nav?: (id?: string) => void) {
    start(async () => {
      const res = (await fn()) as { ok: boolean; id?: string };
      if (res.ok) {
        toast(msg);
        if (nav) nav(res.id);
        else router.refresh();
      } else toast("Action impossible.", "error");
    });
  }

  const listHref = `${basePath}/${isInvoice ? "factures" : "devis"}`;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <Link
        href={listHref}
        prefetch
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {isInvoice ? "Factures" : "Devis"}
      </Link>

      {/* Header */}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight tabular-nums">{doc.number}</h1>
            {isInvoice ? (
              <DisplayInvoiceBadge
                invoice={{
                  status: doc.status,
                  amountPaid: doc.amountPaid,
                  total: doc.total,
                  depositPercent: doc.depositPercent,
                  dueDate: doc.dueDate ? new Date(doc.dueDate) : new Date(),
                  hasBalanceInvoice: doc.hasBalanceInvoice,
                }}
              />
            ) : (
              <QuoteStatusBadge status={doc.status as QuoteStatus} />
            )}
          </div>
          {doc.client && (
            <Link
              href={`${basePath}/clients/${doc.client.id}`}
              prefetch
              className="mt-1 inline-block text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              {doc.client.name}
            </Link>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total TTC</p>
          <p className="text-2xl font-semibold tabular-nums">{formatAmount(doc.total, doc.currency)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {/* Overdue → recovery-first: Relancer primary, Marquer payée next to it. */}
        {isInvoice && A.canRemind && (
          <LiquidGlassButton
            disabled={pending}
            onClick={() => run(() => remindNow(doc.id), "Relance envoyée ✓")}
            className="h-10 rounded-xl px-4 text-sm"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />}
            Relancer maintenant
          </LiquidGlassButton>
        )}
        {isInvoice &&
          A.canInvoiceBalance &&
          (A.primary === "balance" ? (
            <LiquidGlassButton
              disabled={pending}
              onClick={() =>
                run(() => createBalanceInvoice(doc.id), "Facture de solde créée ✓", (id) =>
                  id ? router.push(`${basePath}/factures/${id}`) : router.refresh(),
                )
              }
              className="h-10 rounded-xl px-4 text-sm"
            >
              Facturer le solde
            </LiquidGlassButton>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() => createBalanceInvoice(doc.id), "Facture de solde créée ✓", (id) =>
                  id ? router.push(`${basePath}/factures/${id}`) : router.refresh(),
                )
              }
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
            >
              Facturer le solde
            </button>
          ))}
        {isInvoice &&
          A.canMarkPaid &&
          (A.primary === "markPaid" ? (
            <LiquidGlassButton
              disabled={pending}
              onClick={() => run(() => markFullyPaid(doc.id), "Facture marquée payée ✓")}
              className="h-10 rounded-xl px-4 text-sm"
            >
              {A.markPaidLabel}
            </LiquidGlassButton>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => markFullyPaid(doc.id), "Facture marquée payée ✓")}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
            >
              {A.markPaidLabel}
            </button>
          ))}

        {/* Quote primary */}
        {!isInvoice && doc.status === "ACCEPTED" && !doc.convertedInvoiceId && (
          <LiquidGlassButton
            disabled={pending}
            onClick={() =>
              run(() => convertQuoteToInvoice(doc.id), "Devis converti ✓", (id) =>
                id ? router.push(`${basePath}/factures/${id}`) : router.refresh(),
              )
            }
            className="h-10 rounded-xl px-4 text-sm"
          >
            Convertir en facture
          </LiquidGlassButton>
        )}
        {!isInvoice && doc.convertedInvoiceId && (
          <Link
            href={`${basePath}/factures/${doc.convertedInvoiceId}`}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-info hover:text-info/80"
          >
            Voir la facture
          </Link>
        )}

        {/* Secondary actions */}
        {isInvoice && A.canMarkDepositPaid && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => markDepositPaid(doc.id), "Acompte encaissé ✓")}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            Marquer l&apos;acompte payé
          </button>
        )}
        {!isInvoice && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => sendDocument("DEV", doc.id), "Devis renvoyé ✓")}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Send className="size-4" />
            Renvoyer
          </button>
        )}
        <a
          href={pdfHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          <Download className="size-4" />
          PDF
        </a>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(() => duplicateDocument(doc.kind, doc.id), "Brouillon dupliqué ✓", (id) =>
              id ? router.push(`${basePath}/${isInvoice ? "factures" : "devis"}/${id}`) : router.refresh(),
            )
          }
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          <Copy className="size-4" />
          Refacturer
        </button>
        {doc.status !== "CANCELLED" && doc.status !== "DECLINED" && !paid && (
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
          >
            Annuler
          </button>
        )}
      </div>

      {/* Body: left column (payment + lines + timeline), right column (PDF) */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {isInvoice && (
            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Encaissé</span>
                <span className="tabular-nums text-muted-foreground">
                  {formatAmount(doc.amountPaid, doc.currency)} / {formatAmount(doc.total, doc.currency)}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${paid ? "bg-success" : "bg-primary"}`}
                  style={{ width: `${Math.min(100, Math.round((doc.amountPaid / Math.max(1, doc.total)) * 100))}%` }}
                />
              </div>
            </section>
          )}

          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Prestation</th>
                  <th className="px-4 py-2.5 text-right font-medium">Qté</th>
                  <th className="px-4 py-2.5 text-right font-medium">PU</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {doc.lineItems.map((li, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{li.label}</p>
                      {li.description && <p className="text-xs text-muted-foreground">{li.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{li.quantity}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatAmount(li.unitPrice, doc.currency)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatAmount(Math.round(li.quantity * li.unitPrice), doc.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <DocumentTimeline events={events} scheduled={scheduled} />
          </section>
        </div>

        {/* PDF preview */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 overflow-hidden rounded-xl border border-border bg-muted">
            <iframe title="Aperçu PDF" src={pdfHref} className="h-[520px] w-full" />
          </div>
        </aside>
      </div>

      {confirmCancel && (
        <Modal open onClose={() => setConfirmCancel(false)} title={`Annuler ${doc.number} ?`}>
          <p className="text-sm text-muted-foreground">
            Le document sera marqué comme annulé. Cette action est définitive.
          </p>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmCancel(false)}
              className="h-10 flex-1 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Retour
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() => cancelDocument(doc.kind, doc.id), "Document annulé", () => {
                  setConfirmCancel(false);
                  router.refresh();
                })
              }
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-destructive text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-70"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Annuler le document
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
