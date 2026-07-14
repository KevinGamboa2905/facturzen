"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { LiquidGlassButton } from "@/components/ui/liquid-glass";
import { useToast } from "@/components/ui/toast";
import { LogoField } from "@/components/app/logo-field";
import { updateProfile, updateBilling, updateReminders } from "@/app/actions/settings";
import { CANTONS, COUNTRIES } from "@/lib/profile-options";

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
};

const TABS = [
  { id: "profil", label: "Profil" },
  { id: "facturation", label: "Facturation" },
  { id: "relances", label: "Relances" },
  { id: "abonnement", label: "Abonnement" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const label = "mb-1.5 block text-sm font-medium";
const nativeSelect =
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none transition-colors focus-visible:border-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-ring";

export function SettingsView({ initial, uploadsEnabled }: { initial: SettingsData; uploadsEnabled: boolean }) {
  const [tab, setTab] = useState<TabId>("profil");

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
        {tab === "profil" && <ProfileTab initial={initial} uploadsEnabled={uploadsEnabled} />}
        {tab === "facturation" && <BillingTab initial={initial} />}
        {tab === "relances" && <RemindersTab initial={initial} />}
        {tab === "abonnement" && <SubscriptionTab />}
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

function ProfileTab({ initial, uploadsEnabled }: { initial: SettingsData; uploadsEnabled: boolean }) {
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
        <LogoField value={logoUrl} onChange={setLogoUrl} enabled={uploadsEnabled} />
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

function RemindersTab({ initial }: { initial: SettingsData }) {
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

  return (
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

function SubscriptionTab() {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <CreditCard className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Abonnement</h2>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        La gestion de l&apos;abonnement arrive bientôt. FacturZen reste entièrement utilisable en
        attendant.
      </p>
      <span className="mt-4 inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
        Bientôt disponible
      </span>
    </section>
  );
}
