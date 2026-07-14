"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Banknote, CreditCard, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { LiquidGlassButton } from "@/components/ui/liquid-glass";
import { useToast } from "@/components/ui/toast";
import { LogoField } from "@/components/app/logo-field";
import { LockOverlay } from "@/components/app/locked";
import { PlanBadge } from "@/components/app/plan-badge";
import { PlanCards } from "@/components/app/plan-cards";
import { updateProfile, updateBilling, updateReminders } from "@/app/actions/settings";
import { changePlan, createSubscriptionCheckout, createBillingPortal } from "@/app/actions/billing";
import {
  updatePaymentSettings,
  connectStripe,
  disconnectStripe,
} from "@/app/actions/payments";
import { CANTONS, COUNTRIES } from "@/lib/profile-options";
import { PLANS, PLAN_ORDER, planName, type PlanId } from "@/lib/plans";

export type SettingsData = {
  companyName: string;
  address: string;
  zip: string;
  city: string;
  canton: string;
  country: string;
  iban: string;
  vatEnabled: boolean;
  vatNumber: string;
  logoUrl: string | null;
  defaultCurrency: string;
  paymentTermsDays: number;
  defaultVatRate: number;
  defaultDepositPercent: number | null;
  quotePrefix: string;
  invoicePrefix: string;
  reminderDay1: number;
  reminderDay2: number;
  reminderDay3: number;
  reminderText1: string;
  reminderText2: string;
  reminderText3: string;
  // Plans & payments (PROMPT 10)
  plan: PlanId; // stored plan
  effectivePlan: PlanId;
  trialDaysLeft: number | null;
  trialExpired: boolean;
  sentThisMonth: number;
  invoiceLimit: number; // Infinity = unlimited
  accountHolder: string;
  showBankDetails: boolean;
  stripeConfigured: boolean;
  stripeConnected: boolean;
  stripeChargesEnabled: boolean;
  stripeNeedsAttention: boolean;
};

const TABS = [
  { id: "profil", label: "Profil" },
  { id: "facturation", label: "Facturation" },
  { id: "relances", label: "Relances" },
  { id: "paiements", label: "Paiements" },
  { id: "abonnement", label: "Abonnement" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const label = "mb-1.5 block text-sm font-medium";
const nativeSelect =
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none transition-colors focus-visible:border-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-ring";

export function SettingsView({
  initial,
  uploadsEnabled,
  initialTab = "profil",
}: {
  initial: SettingsData;
  uploadsEnabled: boolean;
  initialTab?: TabId;
}) {
  const [tab, setTab] = useState<TabId>(initialTab);
  const canBranding = PLANS[initial.effectivePlan].features.branding;
  const canReminders = PLANS[initial.effectivePlan].features.reminders;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">Réglages</h1>

      <div className="mt-5 flex flex-wrap gap-1.5" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "profil" && (
          <ProfileTab initial={initial} uploadsEnabled={uploadsEnabled} canBranding={canBranding} />
        )}
        {tab === "facturation" && <BillingTab initial={initial} />}
        {tab === "relances" && <RemindersTab initial={initial} canReminders={canReminders} />}
        {tab === "paiements" && <PaymentsTab initial={initial} />}
        {tab === "abonnement" && <AbonnementTab initial={initial} />}
      </div>
    </div>
  );
}

function SaveButton({ pending }: { pending: boolean }) {
  return (
    <LiquidGlassButton type="submit" disabled={pending} className="h-10 rounded-xl px-5 text-sm">
      {pending && <Loader2 className="size-4 animate-spin" />}
      Enregistrer
    </LiquidGlassButton>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-medium">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function ProfileTab({
  initial,
  uploadsEnabled,
  canBranding,
}: {
  initial: SettingsData;
  uploadsEnabled: boolean;
  canBranding: boolean;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [companyName, setCompanyName] = useState(initial.companyName);
  const [address, setAddress] = useState(initial.address);
  const [zip, setZip] = useState(initial.zip);
  const [city, setCity] = useState(initial.city);
  const [canton, setCanton] = useState(initial.canton);
  const [country, setCountry] = useState(initial.country || "CH");
  const [iban, setIban] = useState(initial.iban);
  const [vatEnabled, setVatEnabled] = useState(initial.vatEnabled);
  const [vatNumber, setVatNumber] = useState(initial.vatNumber);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await updateProfile({
        companyName,
        address,
        zip,
        city,
        canton,
        country,
        iban,
        vatEnabled,
        vatNumber,
        logoUrl,
      });
      if (res.ok) {
        toast("Enregistré ✓");
        router.refresh();
      } else toast(res.error ?? "Erreur");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card title="Identité">
        {canBranding ? (
          <LogoField value={logoUrl} onChange={setLogoUrl} enabled={uploadsEnabled} />
        ) : (
          <LockOverlay
            feature="branding"
            reason="Ajoutez votre logo sur vos documents avec le plan Indépendant."
          >
            <LogoField value={logoUrl} onChange={() => {}} enabled={false} />
          </LockOverlay>
        )}
        <div>
          <label htmlFor="s-name" className={label}>
            Nom de l&apos;entreprise
          </label>
          <Input id="s-name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="h-10" />
        </div>
        <div>
          <label htmlFor="s-addr" className={label}>
            Adresse
          </label>
          <Input id="s-addr" value={address} onChange={(e) => setAddress(e.target.value)} className="h-10" />
        </div>
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <div>
            <label htmlFor="s-zip" className={label}>
              NPA
            </label>
            <Input id="s-zip" value={zip} onChange={(e) => setZip(e.target.value)} className="h-10" />
          </div>
          <div>
            <label htmlFor="s-city" className={label}>
              Ville
            </label>
            <Input id="s-city" value={city} onChange={(e) => setCity(e.target.value)} className="h-10" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="s-canton" className={label}>
              Canton
            </label>
            <select id="s-canton" value={canton} onChange={(e) => setCanton(e.target.value)} className={nativeSelect}>
              <option value="">—</option>
              {CANTONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="s-country" className={label}>
              Pays
            </label>
            <select id="s-country" value={country} onChange={(e) => setCountry(e.target.value)} className={nativeSelect}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card title="Paiement & TVA">
        <div>
          <label htmlFor="s-iban" className={label}>
            QR-IBAN
          </label>
          <Input
            id="s-iban"
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            placeholder="CH.. .... .... .... ...."
            className="h-10 tabular-nums"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Indispensable pour générer la QR-facture suisse.
          </p>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Assujetti à la TVA</p>
            <p className="text-xs text-muted-foreground">Affiche la TVA sur vos documents.</p>
          </div>
          <Switch checked={vatEnabled} onCheckedChange={setVatEnabled} />
        </div>
        {vatEnabled && (
          <div>
            <label htmlFor="s-vatnum" className={label}>
              N° TVA
            </label>
            <Input id="s-vatnum" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} className="h-10" />
          </div>
        )}
      </Card>

      <div className="flex justify-end">
        <SaveButton pending={pending} />
      </div>
    </form>
  );
}

function BillingTab({ initial }: { initial: SettingsData }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [currency, setCurrency] = useState(initial.defaultCurrency || "CHF");
  const [terms, setTerms] = useState(String(initial.paymentTermsDays));
  const [vatRate, setVatRate] = useState(String(initial.defaultVatRate));
  const [deposit, setDeposit] = useState(initial.defaultDepositPercent != null ? String(initial.defaultDepositPercent) : "");
  const [quotePrefix, setQuotePrefix] = useState(initial.quotePrefix || "DEV");
  const [invoicePrefix, setInvoicePrefix] = useState(initial.invoicePrefix || "FAC");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await updateBilling({
        defaultCurrency: currency,
        paymentTermsDays: parseInt(terms, 10),
        defaultVatRate: parseFloat(vatRate.replace(",", ".")),
        defaultDepositPercent: deposit.trim() === "" ? null : parseInt(deposit, 10),
        quotePrefix,
        invoicePrefix,
      });
      if (res.ok) {
        toast("Enregistré ✓");
        router.refresh();
      } else toast(res.error ?? "Erreur");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card title="Facturation">
        <div>
          <span className={label}>Devise par défaut</span>
          <div className="grid grid-cols-2 gap-2">
            {["CHF", "EUR"].map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setCurrency(c)}
                aria-pressed={currency === c}
                className={`h-10 rounded-xl border text-sm font-medium transition-colors ${
                  currency === c
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="s-terms" className={label}>
              Délai de paiement (jours)
            </label>
            <Input id="s-terms" inputMode="numeric" value={terms} onChange={(e) => setTerms(e.target.value)} className="h-10" />
          </div>
          <div>
            <label htmlFor="s-vatrate" className={label}>
              Taux TVA par défaut (%)
            </label>
            <Input id="s-vatrate" inputMode="decimal" value={vatRate} onChange={(e) => setVatRate(e.target.value)} className="h-10" />
          </div>
        </div>
        <div>
          <label htmlFor="s-deposit" className={label}>
            Acompte proposé par défaut (%)
          </label>
          <Input
            id="s-deposit"
            inputMode="numeric"
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
            placeholder="Aucun"
            className="h-10"
          />
        </div>
      </Card>

      <Card title="Numérotation">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="s-qprefix" className={label}>
              Préfixe devis
            </label>
            <Input id="s-qprefix" value={quotePrefix} onChange={(e) => setQuotePrefix(e.target.value)} className="h-10" />
          </div>
          <div>
            <label htmlFor="s-iprefix" className={label}>
              Préfixe factures
            </label>
            <Input id="s-iprefix" value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} className="h-10" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Exemple : {invoicePrefix || "FAC"}-{new Date().getFullYear()}-001
        </p>
      </Card>

      <div className="flex justify-end">
        <SaveButton pending={pending} />
      </div>
    </form>
  );
}

const REMINDER_HINTS = [
  "Relance amicale — quelques jours après l'échéance.",
  "Relance ferme — la facture est en retard.",
  "Relance formelle — dernier rappel avant recouvrement.",
];

function RemindersTab({ initial, canReminders }: { initial: SettingsData; canReminders: boolean }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [days, setDays] = useState([
    String(initial.reminderDay1 || 3),
    String(initial.reminderDay2 || 10),
    String(initial.reminderDay3 || 20),
  ]);
  const [texts, setTexts] = useState([
    initial.reminderText1,
    initial.reminderText2,
    initial.reminderText3,
  ]);

  function setDay(i: number, v: string) {
    setDays((d) => d.map((x, j) => (j === i ? v : x)));
  }
  function setText(i: number, v: string) {
    setTexts((t) => t.map((x, j) => (j === i ? v : x)));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await updateReminders({
        reminderDay1: parseInt(days[0], 10),
        reminderDay2: parseInt(days[1], 10),
        reminderDay3: parseInt(days[2], 10),
        reminderText1: texts[0],
        reminderText2: texts[1],
        reminderText3: texts[2],
      });
      if (res.ok) {
        toast("Enregistré ✓");
        router.refresh();
      } else toast(res.error ?? "Erreur");
    });
  }

  const form = (
    <form onSubmit={submit} className="space-y-4">
      <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Variables disponibles : <code>{"{client}"}</code> <code>{"{numero}"}</code>{" "}
        <code>{"{montant}"}</code> <code>{"{jours}"}</code>
      </p>

      {[0, 1, 2].map((i) => (
        <Card key={i} title={`Relance ${i + 1}`}>
          <p className="-mt-2 text-xs text-muted-foreground">{REMINDER_HINTS[i]}</p>
          <div className="w-40">
            <label htmlFor={`r-day-${i}`} className={label}>
              Envoyer J+
            </label>
            <Input
              id={`r-day-${i}`}
              inputMode="numeric"
              value={days[i]}
              onChange={(e) => setDay(i, e.target.value)}
              className="h-10"
            />
          </div>
          <div>
            <label htmlFor={`r-text-${i}`} className={label}>
              Message
            </label>
            <Textarea
              id={`r-text-${i}`}
              value={texts[i]}
              onChange={(e) => setText(i, e.target.value)}
              rows={3}
              placeholder="Bonjour {client}, la facture {numero} de {montant} est en attente depuis {jours} jours…"
            />
          </div>
          <ReminderPreview text={texts[i]} />
        </Card>
      ))}

      <div className="flex justify-end">
        <SaveButton pending={pending} />
      </div>
    </form>
  );

  if (!canReminders) {
    return (
      <LockOverlay
        feature="reminders"
        reason="Automatisez vos relances de paiement avec le plan Indépendant."
      >
        {form}
      </LockOverlay>
    );
  }
  return form;
}

function ReminderPreview({ text }: { text: string }) {
  const sample = (text || "Bonjour {client}, la facture {numero} de {montant} est en attente depuis {jours} jours.")
    .replaceAll("{client}", "Boulangerie Reber")
    .replaceAll("{numero}", "FAC-2026-004")
    .replaceAll("{montant}", "1 250.00 CHF")
    .replaceAll("{jours}", "12");
  return (
    <div>
      <p className={label}>Aperçu</p>
      <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground whitespace-pre-wrap">
        {sample}
      </p>
    </div>
  );
}

function AbonnementTab({ initial }: { initial: SettingsData }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [target, setTarget] = useState<PlanId>(initial.effectivePlan);

  const current = initial.effectivePlan;
  const unlimited = initial.invoiceLimit === Infinity;

  function apply() {
    start(async () => {
      // Paid plan with Stripe configured → Checkout; otherwise internal change.
      if (target !== "FREE" && initial.stripeConfigured) {
        const res = await createSubscriptionCheckout(target);
        if (res.ok && res.url) {
          window.location.href = res.url;
          return;
        }
        // No price configured etc. → fall back to internal trial change.
      }
      const res = await changePlan(target);
      if (res.ok) {
        toast("Plan mis à jour ✓");
        router.refresh();
      } else toast("Impossible de changer de plan.");
    });
  }

  function openPortal() {
    start(async () => {
      const res = await createBillingPortal();
      if (res.ok && res.url) window.location.href = res.url;
      else toast("Portail indisponible.");
    });
  }

  return (
    <div className="space-y-4">
      <Card title="Votre plan">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-semibold">{planName(current)}</span>
          <PlanBadge plan={current} trialDaysLeft={initial.trialDaysLeft} />
        </div>
        {initial.trialExpired && (
          <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
            Votre essai est terminé — repassez à Indépendant quand vous voulez. Vos données sont
            intactes.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Factures envoyées ce mois : {" "}
          <span className="font-medium text-foreground tabular-nums">
            {initial.sentThisMonth}
            {unlimited ? "" : ` / ${initial.invoiceLimit}`}
          </span>
          {unlimited ? " (illimité)" : ""}
        </p>
      </Card>

      <Card title="Changer de plan">
        <PlanCards selected={target} onSelect={setTarget} compact />
        <p className="text-xs text-muted-foreground">
          {PLAN_ORDER.indexOf(target) < PLAN_ORDER.indexOf(current)
            ? "La rétrogradation prend effet à la fin du cycle en cours ; les fonctionnalités du plan supérieur seront alors verrouillées."
            : target === current
              ? "C'est votre plan actuel."
              : "La mise à niveau est immédiate."}
        </p>
        {!initial.stripeConfigured && target !== "FREE" && (
          <p className="text-xs text-muted-foreground">
            Le paiement de l&apos;abonnement sera bientôt activé sur la plateforme — en attendant,
            vous démarrez un essai.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <LiquidGlassButton
            onClick={apply}
            disabled={pending || target === current}
            className="h-10 rounded-xl px-5 text-sm"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {target === "FREE" ? "Passer à Libre" : `Passer à ${planName(target)}`}
          </LiquidGlassButton>
          {initial.stripeConfigured && initial.effectivePlan !== "FREE" && (
            <button
              type="button"
              onClick={openPortal}
              disabled={pending}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
            >
              <CreditCard className="size-4" />
              Gérer mon abonnement
            </button>
          )}
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">
        Multi-utilisateurs et accès API arrivent bientôt sur le plan Studio.
      </p>
    </div>
  );
}

function PaymentsTab({ initial }: { initial: SettingsData }) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [iban, setIban] = useState(initial.iban);
  const [holder, setHolder] = useState(initial.accountHolder);
  const [show, setShow] = useState(initial.showBankDetails);

  const bankActive = show && iban.trim().length > 0;
  const stripeActive = initial.stripeConnected && initial.stripeChargesEnabled;
  const noMethod = !bankActive && !stripeActive;

  function saveBank(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await updatePaymentSettings({ iban, accountHolder: holder, showBankDetails: show });
      if (res.ok) {
        toast("Enregistré ✓");
        router.refresh();
      } else toast(res.error ?? "Erreur");
    });
  }

  function connect() {
    start(async () => {
      const res = await connectStripe();
      if (res.ok && res.url) window.location.href = res.url;
      else toast("Connexion Stripe indisponible.");
    });
  }

  function disconnect() {
    start(async () => {
      await disconnectStripe();
      toast("Compte Stripe déconnecté");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {noMethod && (
        <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          Aucun moyen de paiement actif — vos clients ne sauront pas comment vous payer.
        </p>
      )}

      <form onSubmit={saveBank}>
        <Card title="Virement bancaire">
          <div className="flex items-center gap-2 text-sm">
            <Banknote className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">Affiché sur vos factures (PDF + page publique).</span>
          </div>
          <div>
            <label htmlFor="p-iban" className={label}>
              IBAN / QR-IBAN
            </label>
            <Input id="p-iban" value={iban} onChange={(e) => setIban(e.target.value)} className="h-10 tabular-nums" />
          </div>
          <div>
            <label htmlFor="p-holder" className={label}>
              Titulaire du compte
            </label>
            <Input id="p-holder" value={holder} onChange={(e) => setHolder(e.target.value)} className="h-10" />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <span className="text-sm font-medium">Afficher mes coordonnées bancaires sur les factures</span>
            <Switch checked={show} onCheckedChange={setShow} />
          </div>
          <div className="flex justify-end">
            <SaveButton pending={pending} />
          </div>
        </Card>
      </form>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <CreditCard className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Paiement en ligne (Stripe)</h2>
        </div>

        {!initial.stripeConfigured ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Le paiement en ligne n&apos;est pas encore activé sur la plateforme. Le virement bancaire
            ci-dessus fonctionne dès maintenant.
          </p>
        ) : !PLANS[initial.effectivePlan].features.onlinePayment ? (
          <div className="mt-3">
            <LockOverlay feature="onlinePayment" reason="Encaissez vos factures en ligne avec le plan Indépendant.">
              <p className="text-sm text-muted-foreground">
                Connectez Stripe pour que vos clients paient par carte directement depuis la facture.
              </p>
            </LockOverlay>
          </div>
        ) : initial.stripeConnected ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm">
              {stripeActive ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-success">
                  Connecté ✓ — paiements activés
                </span>
              ) : (
                <span className="text-warning">Configuration à terminer.</span>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {!stripeActive && (
                <LiquidGlassButton onClick={connect} disabled={pending} className="h-10 rounded-xl px-4 text-sm">
                  Terminer la configuration
                </LiquidGlassButton>
              )}
              <button
                type="button"
                onClick={disconnect}
                disabled={pending}
                className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive"
              >
                Déconnecter
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-muted-foreground">
              Connectez votre compte Stripe pour encaisser vos factures en ligne.
            </p>
            <LiquidGlassButton onClick={connect} disabled={pending} className="mt-3 h-10 rounded-xl px-4 text-sm">
              {pending && <Loader2 className="size-4 animate-spin" />}
              Connecter Stripe
            </LiquidGlassButton>
          </div>
        )}
      </section>
    </div>
  );
}
