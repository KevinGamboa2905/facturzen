"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, BadgeCheck, Check, Download, Loader2, Plus, Search, Send, Trash2, UserPlus } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/money";
import { computeTotals } from "@/lib/totals";
import { unitSuffix } from "@/lib/units";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { LiquidGlassButton } from "@/components/ui/liquid-glass";
import { useToast } from "@/components/ui/toast";
import { DisplayInvoiceBadge, QuoteStatusBadge } from "@/components/app/status-badge";
import type { QuoteStatus } from "@/lib/status";
import { depositAmountOf } from "@/lib/app/invoice-status";
import {
  saveDocument,
  incrementServiceUsage,
  sendDocument,
  markDepositPaid,
  markFullyPaid,
  convertQuoteToInvoice,
  createBalanceInvoice,
  type DocKind,
} from "@/app/actions/documents";
import { ClientCreateModal } from "@/components/app/client-create-modal";
import { DepositSelector, type DepositChoice } from "@/components/app/deposit-selector";
import { useUpgrade } from "@/components/app/upgrade-modal";

type ClientLite = { id: string; name: string; city: string | null; email: string | null };
type ServiceLite = {
  id: string;
  name: string;
  description: string | null;
  unitType: string;
  unitPrice: number;
  vatRate: number;
  isFavorite: boolean;
  timesUsed: number;
  currency: string;
};
type Line = {
  key: string;
  label: string;
  description: string | null;
  qty: string;
  price: string; // CHF
  vatRate: number;
  serviceId: string | null;
};

let keyCounter = 0;
const newKey = () => `l${keyCounter++}`;

function parseCents(chf: string): number {
  const n = parseFloat((chf || "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

// Shared dismiss behaviour for both comboboxes: Escape + click outside close the
// popover (without selecting). Fixes the "menu stays open" class of bug once.
function useDismiss(ref: React.RefObject<HTMLElement | null>, onDismiss: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [ref, onDismiss, active]);
}

type FocusTarget = { key: string; field: "label" | "qty" } | null;

export function DocumentBuilder({
  kind,
  docId,
  number,
  status,
  amountPaid = 0,
  dueDate,
  convertedInvoiceId = null,
  currency,
  company,
  clients: initialClients,
  services,
  initial,
}: {
  kind: DocKind;
  docId: string;
  number: string;
  status: string;
  amountPaid?: number;
  dueDate?: string | null;
  convertedInvoiceId?: string | null;
  currency: string;
  company: { name: string; city: string | null };
  clients: ClientLite[];
  services: ServiceLite[];
  initial: {
    clientId: string | null;
    depositPercent: number | null;
    lineItems: { label: string; description: string | null; quantity: number; unitPrice: number; vatRate: number }[];
  };
}) {
  const isQuote = kind === "DEV";
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const upgrade = useUpgrade();
  const [sendOpen, setSendOpen] = useState(false);
  const [emailBody, setEmailBody] = useState("");
  const [convertConfirm, setConvertConfirm] = useState(false);
  const [actionPending, startAction] = useTransition();

  const [clients, setClients] = useState(initialClients);
  const [clientId, setClientId] = useState<string | null>(initial.clientId);
  const [focus, setFocus] = useState<FocusTarget>(null);
  const [clientModal, setClientModal] = useState<{ name: string } | null>(null);
  const catalogueRef = useRef<HTMLInputElement>(null);
  const [lines, setLines] = useState<Line[]>(
    initial.lineItems.length
      ? initial.lineItems.map((li) => ({
          key: newKey(),
          label: li.label,
          description: li.description,
          qty: String(li.quantity),
          price: (li.unitPrice / 100).toString(),
          vatRate: li.vatRate,
          serviceId: null,
        }))
      : [],
  );

  const initialChoice: DepositChoice =
    initial.depositPercent == null
      ? "none"
      : [30, 40, 50].includes(initial.depositPercent)
        ? (String(initial.depositPercent) as DepositChoice)
        : "custom";
  const [depositChoice, setDepositChoice] = useState<DepositChoice>(initialChoice);
  const [customDeposit, setCustomDeposit] = useState(
    initial.depositPercent != null && initialChoice === "custom" ? String(initial.depositPercent) : "",
  );

  const depositPercent = useMemo(() => {
    if (depositChoice === "none") return null;
    if (depositChoice === "custom") return Number(customDeposit) || null;
    return Number(depositChoice);
  }, [depositChoice, customDeposit]);

  const totals = useMemo(
    () =>
      computeTotals(
        lines.map((l) => ({ quantity: Number(l.qty) || 0, unitPrice: parseCents(l.price), vatRate: l.vatRate })),
        depositPercent,
      ),
    [lines, depositPercent],
  );

  // Autosave 800ms after the last change (§5) — never a manual save button.
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const first = useRef(true);
  const linesSig = JSON.stringify(lines.map((l) => [l.label, l.description, l.qty, l.price, l.vatRate]));

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaving(true);
    const t = setTimeout(() => {
      saveDocument(kind, docId, {
        clientId,
        depositPercent,
        lineItems: lines.map((l) => ({
          label: l.label,
          description: l.description,
          quantity: Number(l.qty) || 1,
          unitPrice: parseCents(l.price),
          vatRate: l.vatRate,
        })),
      }).then((res) => {
        setSaving(false);
        if (res.ok && res.savedAt) setSavedAt(res.savedAt);
      });
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, depositPercent, linesSig]);

  function patchLine(key: string, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }
  function removeLine(key: string) {
    setLines((ls) => ls.filter((l) => l.key !== key));
  }
  function addFreeLine() {
    const key = newKey();
    setLines((ls) => [
      ...ls,
      { key, label: "", description: null, qty: "1", price: "", vatRate: 8.1, serviceId: null },
    ]);
    setFocus({ key, field: "label" });
  }
  function insertService(s: ServiceLite) {
    const key = newKey();
    setLines((ls) => [
      ...ls,
      {
        key,
        label: s.name,
        description: s.description,
        qty: "1",
        price: (s.unitPrice / 100).toString(),
        vatRate: s.vatRate,
        serviceId: s.id,
      },
    ]);
    setFocus({ key, field: "qty" }); // focus lands on the inserted line's quantity (§1)
    startTransition(() => void incrementServiceUsage(s.id));
  }

  const selectedClient = clients.find((c) => c.id === clientId) ?? null;
  const clientName = selectedClient?.name ?? "le client";
  const basePath = `/${usePathname().split("/")[1] || "demo"}`;

  function openSend() {
    setEmailBody(
      `Bonjour,\n\nVeuillez trouver ${isQuote ? "le devis" : "la facture"} ${number} en pièce jointe.\n\n` +
        `Avec mes remerciements,\n${company.name}`,
    );
    setSendOpen(true);
  }
  function handleSend() {
    startAction(async () => {
      const res = await sendDocument(kind, docId);
      setSendOpen(false);
      if (res.ok) {
        const noun = isQuote ? "Devis" : "Facture";
        const accord = isQuote ? "" : "e";
        toast(
          "simulated" in res && res.simulated
            ? `${noun} marqué${accord} envoyé${accord} — email simulé (Resend non configuré)`
            : `${noun} envoyé${accord} à ${clientName} ✓`,
        );
        router.refresh();
      } else if ("reason" in res && res.reason === "LIMIT") {
        // Draft is untouched — only the send is blocked; nudge to upgrade.
        upgrade.open(
          `Vous avez envoyé vos ${res.limit} factures gratuites de ${res.monthLabel}. Passez à Indépendant pour des factures illimitées.`,
        );
      } else toast("L'envoi a échoué.", "error");
    });
  }
  const depositAmount = depositAmountOf(totals.ttc, depositPercent);
  const fullyPaid = totals.ttc > 0 && amountPaid >= totals.ttc;
  const depositCollected = depositAmount > 0 && amountPaid >= depositAmount;

  function handleDepositPaid() {
    startAction(async () => {
      const res = await markDepositPaid(docId);
      if (res.ok && res.deposit != null) {
        toast(
          `Acompte de ${formatAmount(res.deposit, currency as "CHF" | "EUR")} encaissé ✓ — Solde restant : ${formatAmount(res.remaining ?? 0, currency as "CHF" | "EUR")}`,
        );
        router.refresh();
      } else toast("Action impossible.", "error");
    });
  }
  function handleFullyPaid() {
    startAction(async () => {
      const res = await markFullyPaid(docId);
      if (res.ok) {
        toast("Facture payée ✓");
        router.refresh();
      } else toast("Action impossible.", "error");
    });
  }
  function handleConvert() {
    startAction(async () => {
      const res = await convertQuoteToInvoice(docId);
      if (res.ok && res.id) {
        toast("Facture créée depuis le devis ✓");
        router.push(`${basePath}/factures/${res.id}?nouvelle=1`);
      } else toast("Conversion impossible.", "error");
    });
  }
  function handleBalance() {
    startAction(async () => {
      const res = await createBalanceInvoice(docId);
      if (res.ok && res.id) {
        toast("Facture de solde créée ✓");
        router.push(`${basePath}/factures/${res.id}?nouvelle=1`);
      } else toast("Impossible de facturer le solde.", "error");
    });
  }

  return (
    <div className="grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_460px]">
      {/* Editor */}
      <div className="min-w-0 px-5 py-6 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {isQuote ? "Modifier le devis" : "Modifier la facture"}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">{number}</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`/api/pdf/${isQuote ? "devis" : "facture"}/${docId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Download className="size-4" />
              PDF
            </a>
            <SaveIndicator saving={saving} savedAt={savedAt} />
          </div>
        </header>

        {/* Status + primary action */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {isQuote ? (
            <QuoteStatusBadge status={status as QuoteStatus} />
          ) : (
            <DisplayInvoiceBadge
              invoice={{
                status,
                amountPaid,
                total: totals.ttc,
                depositPercent,
                dueDate: dueDate ? new Date(dueDate) : new Date(),
              }}
            />
          )}

          {status === "DRAFT" && (
            <LiquidGlassButton onClick={openSend} className="h-10 rounded-xl px-4 text-sm">
              <Send className="size-4" />
              Envoyer
            </LiquidGlassButton>
          )}
          {isQuote && convertedInvoiceId ? (
            <a
              href={`${basePath}/factures/${convertedInvoiceId}`}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-info transition-colors hover:text-info/80"
            >
              Voir la facture
              <ArrowRight className="size-4" />
            </a>
          ) : isQuote && status === "ACCEPTED" ? (
            <LiquidGlassButton disabled={actionPending} onClick={handleConvert} className="h-10 rounded-xl px-4 text-sm">
              {actionPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
              Convertir en facture
            </LiquidGlassButton>
          ) : isQuote && status === "SENT" ? (
            convertConfirm ? (
              <span className="inline-flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Pas encore accepté. Convertir quand même ?</span>
                <LiquidGlassButton disabled={actionPending} onClick={handleConvert} className="h-10 rounded-xl px-4 text-sm">
                  {actionPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Oui, convertir
                </LiquidGlassButton>
                <button onClick={() => setConvertConfirm(false)} className="text-sm text-muted-foreground hover:text-foreground">
                  Annuler
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConvertConfirm(true)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowRight className="size-4" />
                Convertir en facture
              </button>
            )
          ) : null}

          {/* Invoice payment actions, deposit-aware (§2) */}
          {!isQuote && status !== "DRAFT" && !fullyPaid && (
            depositAmount > 0 && !depositCollected ? (
              <LiquidGlassButton disabled={actionPending} onClick={handleDepositPaid} className="h-10 rounded-xl px-4 text-sm">
                {actionPending ? <Loader2 className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}
                Marquer l&apos;acompte payé — {formatAmount(depositAmount, currency as "CHF" | "EUR")}
              </LiquidGlassButton>
            ) : depositAmount > 0 && depositCollected ? (
              <LiquidGlassButton disabled={actionPending} onClick={handleBalance} className="h-10 rounded-xl px-4 text-sm">
                {actionPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                Facturer le solde
              </LiquidGlassButton>
            ) : (
              <LiquidGlassButton disabled={actionPending} onClick={handleFullyPaid} className="h-10 rounded-xl px-4 text-sm">
                {actionPending ? <Loader2 className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}
                Marquer payée
              </LiquidGlassButton>
            )
          )}
          {/* Secondary: pay everything at once */}
          {!isQuote && status !== "DRAFT" && !fullyPaid && depositAmount > 0 && (
            <button
              disabled={actionPending}
              onClick={handleFullyPaid}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Marquer entièrement payée
            </button>
          )}
        </div>

        {/* Client */}
        <section className="mt-6">
          <label className="mb-1.5 block text-sm font-medium">Client</label>
          <ClientCombobox
            clients={clients}
            selected={selectedClient}
            onSelect={setClientId}
            onNewClient={(prefill) => setClientModal({ name: prefill })}
          />
        </section>

        {/* Line items */}
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium">Prestations</label>
          </div>

          {lines.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="hidden bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[1fr_64px_96px_64px_88px_32px] sm:gap-2">
                <span>Désignation</span>
                <span className="text-right">Qté</span>
                <span className="text-right">Prix</span>
                <span className="text-right">TVA</span>
                <span className="text-right">Total</span>
                <span />
              </div>
              <ul className="divide-y divide-border">
                {lines.map((l) => {
                  const lineTtc = Math.round((Number(l.qty) || 0) * parseCents(l.price));
                  return (
                    <li
                      key={l.key}
                      className="grid grid-cols-1 gap-2 px-3 py-3 sm:grid-cols-[1fr_64px_96px_64px_88px_32px] sm:items-center"
                    >
                      <div className="min-w-0">
                        <Input
                          ref={(el: HTMLInputElement | null) => {
                            if (el && focus?.key === l.key && focus.field === "label") {
                              el.focus();
                              setFocus(null);
                            }
                          }}
                          value={l.label}
                          onChange={(e) => patchLine(l.key, { label: e.target.value })}
                          placeholder="Désignation"
                          className="h-9 border-transparent bg-transparent px-2 focus:border-border"
                        />
                        {l.description && (
                          <p className="truncate px-2 text-xs text-muted-foreground">{l.description}</p>
                        )}
                      </div>
                      <Input
                        ref={(el: HTMLInputElement | null) => {
                          if (el && focus?.key === l.key && focus.field === "qty") {
                            el.focus();
                            el.select();
                            setFocus(null);
                          }
                        }}
                        value={l.qty}
                        onChange={(e) => patchLine(l.key, { qty: e.target.value })}
                        inputMode="decimal"
                        aria-label="Quantité"
                        className="h-9 px-2 text-right tabular-nums"
                      />
                      <Input
                        value={l.price}
                        onChange={(e) => patchLine(l.key, { price: e.target.value })}
                        inputMode="decimal"
                        aria-label="Prix unitaire"
                        className="h-9 px-2 text-right tabular-nums"
                      />
                      <Input
                        value={String(l.vatRate)}
                        onChange={(e) => patchLine(l.key, { vatRate: Number(e.target.value) })}
                        inputMode="decimal"
                        aria-label="TVA"
                        className="h-9 px-2 text-right tabular-nums"
                      />
                      <span className="px-2 text-right text-sm font-medium tabular-nums">
                        {formatAmount(lineTtc)}
                      </span>
                      <button
                        onClick={() => removeLine(l.key)}
                        aria-label="Supprimer la ligne"
                        className="grid size-8 place-items-center justify-self-end rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Catalogue combobox — the §1 payoff */}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <CatalogueCombobox services={services} onInsert={insertService} inputRef={catalogueRef} />
            <button
              onClick={addFreeLine}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="size-4" />
              Ligne libre
            </button>
          </div>
        </section>

        {/* Deposit — devis AND factures (§2) */}
        <section className="mt-6">
          <label className="mb-1.5 block text-sm font-medium">Acompte</label>
          <DepositSelector
            choice={depositChoice}
            custom={customDeposit}
            onChoice={setDepositChoice}
            onCustom={setCustomDeposit}
          />
          {!isQuote && depositPercent ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Cette facture sera une <span className="text-foreground">facture d&apos;acompte</span> :{" "}
              {formatAmount(totals.deposit, currency as "CHF" | "EUR")} sur {formatAmount(totals.ttc, currency as "CHF" | "EUR")}.
            </p>
          ) : null}
        </section>

        {/* Totals */}
        <section className="mt-6 flex justify-end">
          <dl className="w-full max-w-xs space-y-1.5 text-sm">
            <Row label="Total HT" value={formatAmount(totals.ht, currency as "CHF" | "EUR")} />
            {totals.vatByRate.map((v) => (
              <Row
                key={v.rate}
                label={`TVA ${v.rate} %`}
                value={formatAmount(v.amount, currency as "CHF" | "EUR")}
                muted
              />
            ))}
            <div className="!mt-2 flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
              <dt>Total TTC</dt>
              <dd className="tabular-nums">{formatAmount(totals.ttc, currency as "CHF" | "EUR")}</dd>
            </div>
            {depositPercent ? (
              <Row
                label={`Acompte ${depositPercent} %`}
                value={formatAmount(totals.deposit, currency as "CHF" | "EUR")}
                accent
              />
            ) : null}
          </dl>
        </section>
      </div>

      {/* Live preview */}
      <aside className="hidden border-l border-border bg-muted/20 p-6 lg:block">
        <div className="sticky top-6">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Aperçu</p>
          <DocumentPreview
            kind={kind}
            number={number}
            currency={currency}
            company={company}
            client={selectedClient}
            lines={lines}
            totals={totals}
            depositPercent={depositPercent}
          />
        </div>
      </aside>

      {/* Inline client creation (§1) — keeps builder work intact */}
      {clientModal && (
        <ClientCreateModal
          prefillName={clientModal.name}
          onClose={() => setClientModal(null)}
          onCreated={(c) => {
            setClients((cs) => [...cs, c]);
            setClientId(c.id);
            setClientModal(null);
            catalogueRef.current?.focus(); // focus moves to the next step (prestations)
          }}
        />
      )}

      {/* Send confirmation (§3): a modal, not a page */}
      <Modal open={sendOpen} onClose={() => setSendOpen(false)} title={isQuote ? "Envoyer le devis" : "Envoyer la facture"}>
        <div className="space-y-3 text-sm">
          <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            Mode démo — cet email n&apos;est pas réellement envoyé.
          </div>
          <p>
            <span className="text-muted-foreground">À : </span>
            {selectedClient?.email ?? <span className="text-muted-foreground">adresse du client</span>}
          </p>
          <p>
            <span className="text-muted-foreground">Objet : </span>
            Votre {isQuote ? "devis" : "facture"} n° {number} — {company.name}
          </p>
          <textarea
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-ring"
          />
          <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            <Download className="size-3.5" />
            {number}.pdf
          </div>
          <LiquidGlassButton disabled={actionPending} onClick={handleSend} className="h-10 w-full rounded-xl px-4 text-sm">
            {actionPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Simuler l&apos;envoi
          </LiquidGlassButton>
        </div>
      </Modal>
    </div>
  );
}

function Row({ label, value, muted, accent }: { label: string; value: string; muted?: boolean; accent?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between", muted && "text-muted-foreground", accent && "text-info")}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function SaveIndicator({ saving, savedAt }: { saving: boolean; savedAt: number | null }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 10_000);
    return () => clearInterval(i);
  }, []);
  if (saving)
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Enregistrement…
      </span>
    );
  if (savedAt) {
    const secs = Math.round((Date.now() - savedAt) / 1000);
    const rel = secs < 5 ? "à l'instant" : secs < 60 ? `il y a ${secs} s` : `il y a ${Math.round(secs / 60)} min`;
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Check className="size-3.5 text-success" /> Enregistré · {rel}
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">Brouillon</span>;
}

function ClientCombobox({
  clients,
  selected,
  onSelect,
  onNewClient,
}: {
  clients: ClientLite[];
  selected: ClientLite | null;
  onSelect: (id: string) => void;
  onNewClient: (prefillName: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(rootRef, close, open);

  const q = query.trim().toLowerCase();
  const filtered = clients.filter((c) => c.name.toLowerCase().includes(q));
  const exact = clients.some((c) => c.name.toLowerCase() === q);
  // Permanent entry; prefilled with the typed name when there's no match.
  const createPrefill = query.trim() && !exact ? query.trim() : "";

  if (selected && !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-left text-sm transition-colors hover:border-muted-foreground/40"
      >
        <span>
          <span className="font-medium">{selected.name}</span>
          {selected.city && <span className="text-muted-foreground"> · {selected.city}</span>}
        </span>
        <span className="text-xs text-muted-foreground">Changer</span>
      </button>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="Rechercher ou créer un client…"
          className="pl-9"
        />
      </div>
      {open && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-card p-1 shadow-lg">
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => {
                  onSelect(c.id);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span>{c.name}</span>
                {c.city && <span className="text-xs text-muted-foreground">{c.city}</span>}
              </button>
            </li>
          ))}
          <li className={filtered.length > 0 ? "mt-1 border-t border-border pt-1" : ""}>
            <button
              onClick={() => onNewClient(createPrefill)}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-info hover:bg-muted"
            >
              <UserPlus className="size-4" />
              {createPrefill ? `Créer le client « ${createPrefill} »` : "Nouveau client"}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

function CatalogueCombobox({
  services,
  onInsert,
  inputRef,
}: {
  services: ServiceLite[];
  onInsert: (s: ServiceLite) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(rootRef, close, open);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services
      .filter((s) => (q ? [s.name, s.description].some((f) => f?.toLowerCase().includes(q)) : true))
      .sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite) || b.timesUsed - a.timesUsed)
      .slice(0, 6);
  }, [services, query]);

  // Insert then close the popover and clear the search — the parent moves focus
  // to the new line's quantity, so we never re-open it here.
  const pick = (s: ServiceLite) => {
    onInsert(s);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative flex-1">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filtered[0]) {
              e.preventDefault();
              pick(filtered[0]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Ajouter une prestation du catalogue…"
          className="pl-9"
        />
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-card p-1 shadow-lg">
          {filtered.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => pick(s)}
                className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{s.name}</span>
                  {s.description && (
                    <span className="block truncate text-xs text-muted-foreground">{s.description}</span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {formatAmount(s.unitPrice, s.currency as "CHF" | "EUR")} {unitSuffix(s.unitType)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DocumentPreview({
  kind,
  number,
  currency,
  company,
  client,
  lines,
  totals,
  depositPercent,
}: {
  kind: DocKind;
  number: string;
  currency: string;
  company: { name: string; city: string | null };
  client: ClientLite | null;
  lines: Line[];
  totals: ReturnType<typeof computeTotals>;
  depositPercent: number | null;
}) {
  const cur = currency as "CHF" | "EUR";
  return (
    <div className="aspect-[1/1.414] w-full overflow-hidden rounded-lg bg-white text-[11px] text-[#0d0d0d] shadow-xl">
      <div className="flex h-full flex-col p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold">{company.name}</p>
            {company.city && <p className="text-[10px] text-neutral-500">{company.city}</p>}
          </div>
          <div className="text-right">
            <p className="text-base font-bold uppercase tracking-wide">
              {kind === "FAC" ? "Facture" : "Devis"}
            </p>
            <p className="text-[10px] text-neutral-500 tabular-nums">{number}</p>
          </div>
        </div>

        <div className="mt-6 text-[10px]">
          <p className="text-neutral-400">Adressé à</p>
          <p className="font-medium">{client?.name ?? "—"}</p>
        </div>

        <table className="mt-4 w-full border-collapse">
          <thead>
            <tr className="border-b border-neutral-200 text-[9px] uppercase text-neutral-400">
              <th className="py-1 text-left font-medium">Désignation</th>
              <th className="py-1 text-right font-medium">Qté</th>
              <th className="py-1 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr>
                <td colSpan={3} className="py-3 text-center text-[10px] text-neutral-300">
                  Ajoutez une prestation…
                </td>
              </tr>
            )}
            {lines.map((l) => (
              <tr key={l.key} className="border-b border-neutral-100 align-top">
                <td className="py-1.5 pr-2">
                  <span className="font-medium">{l.label || "—"}</span>
                  {l.description && <span className="block text-[9px] text-neutral-400">{l.description}</span>}
                </td>
                <td className="py-1.5 text-right tabular-nums">{l.qty}</td>
                <td className="py-1.5 text-right tabular-nums">
                  {formatAmount(Math.round((Number(l.qty) || 0) * parseCents(l.price)), cur)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto w-40 space-y-1 text-[10px]">
          <div className="flex justify-between text-neutral-500">
            <span>Total HT</span>
            <span className="tabular-nums">{formatAmount(totals.ht, cur)}</span>
          </div>
          {totals.vatByRate.map((v) => (
            <div key={v.rate} className="flex justify-between text-neutral-500">
              <span>TVA {v.rate}%</span>
              <span className="tabular-nums">{formatAmount(v.amount, cur)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-neutral-200 pt-1 font-semibold">
            <span>Total TTC</span>
            <span className="tabular-nums">{formatAmount(totals.ttc, cur)}</span>
          </div>
        </div>

        {depositPercent ? (
          <div className="mt-3 rounded bg-neutral-50 p-2 text-[9px] text-neutral-600">
            Acompte à la commande ({depositPercent}%) :{" "}
            <span className="font-medium">{formatAmount(totals.deposit, cur)}</span>
            {" — "}Solde à la livraison :{" "}
            <span className="font-medium">{formatAmount(totals.ttc - totals.deposit, cur)}</span>
          </div>
        ) : null}

        <div className="mt-auto pt-4 text-center text-[8px] text-neutral-300">
          Propulsé par Facty
        </div>
      </div>
    </div>
  );
}
