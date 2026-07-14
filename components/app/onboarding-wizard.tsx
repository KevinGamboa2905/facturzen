"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { LiquidGlassButton } from "@/components/ui/liquid-glass";
import {
  ACTIVITY_TYPES,
  CANTONS,
  COUNTRIES,
  DEFAULT_CANTON,
} from "@/lib/profile-options";
import {
  saveOnboardingProfile,
  saveOnboardingBilling,
  completeOnboarding,
} from "@/app/actions/onboarding";

export type OnboardingInitial = {
  companyName: string;
  activityType: string;
  canton: string;
  country: string;
  defaultCurrency: string;
  vatEnabled: boolean;
  vatNumber: string;
  defaultVatRate: number;
  paymentTermsDays: number;
};

const nativeSelect =
  "h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none transition-colors focus-visible:border-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-ring";
const fieldLabel = "mb-1.5 block text-sm font-medium";

// 3-step onboarding (prompt 2 §2a). Each step saves via a server action before
// advancing, so closing the tab and returning resumes at the right step (the
// server page computes the initial step from what's already saved).
export function OnboardingWizard({
  initial,
  initialStep,
}: {
  initial: OnboardingInitial;
  initialStep: 1 | 2 | 3;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(initialStep);
  const [pending, start] = useTransition();

  // Step 1
  const [companyName, setCompanyName] = useState(initial.companyName);
  const [activityType, setActivityType] = useState(initial.activityType || ACTIVITY_TYPES[0]);
  const [canton, setCanton] = useState(initial.canton || DEFAULT_CANTON);
  const [country, setCountry] = useState(initial.country || "CH");

  // Step 2
  const [currency, setCurrency] = useState(initial.defaultCurrency || "CHF");
  const [vatEnabled, setVatEnabled] = useState(initial.vatEnabled);
  const [vatNumber, setVatNumber] = useState(initial.vatNumber);
  const [vatRate, setVatRate] = useState(String(initial.defaultVatRate || 8.1));
  const [terms, setTerms] = useState(String(initial.paymentTermsDays || 30));

  const goStep1 = useCallback(() => {
    start(async () => {
      await saveOnboardingProfile({ companyName, activityType, canton, country });
      setStep(2);
    });
  }, [companyName, activityType, canton, country]);

  const goStep2 = useCallback(() => {
    start(async () => {
      await saveOnboardingBilling({
        defaultCurrency: currency,
        vatEnabled,
        vatNumber,
        defaultVatRate: parseFloat(vatRate.replace(",", ".")),
        paymentTermsDays: parseInt(terms, 10),
      });
      setStep(3);
    });
  }, [currency, vatEnabled, vatNumber, vatRate, terms]);

  const finish = useCallback(
    (href: string) => {
      start(async () => {
        await completeOnboarding();
        router.push(href);
      });
    },
    [router],
  );

  // Enter = continue on steps 1 & 2.
  const onFormSubmit = (fn: () => void) => (e: React.FormEvent) => {
    e.preventDefault();
    fn();
  };

  return (
    <main className="flex min-h-dvh flex-col bg-background px-6 py-8 text-foreground">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {/* Progress */}
        <div className="flex items-center gap-2" aria-label={`Étape ${step} sur 3`}>
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                n <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground tabular-nums">{step}/3</p>

        <div className="flex flex-1 flex-col justify-center py-8">
          {step === 1 && (
            <form onSubmit={onFormSubmit(goStep1)}>
              <h1 className="text-2xl font-semibold tracking-tight">Qui facture ?</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Ces informations apparaîtront sur vos documents.
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="ob-name" className={fieldLabel}>
                    Nom de l&apos;activité
                  </label>
                  <Input
                    id="ob-name"
                    autoFocus
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Votre nom ou celui de votre studio"
                    className="h-11"
                  />
                </div>
                <div>
                  <label htmlFor="ob-activity" className={fieldLabel}>
                    Type d&apos;activité
                  </label>
                  <select
                    id="ob-activity"
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value)}
                    className={nativeSelect}
                  >
                    {ACTIVITY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="ob-canton" className={fieldLabel}>
                      Canton
                    </label>
                    <select
                      id="ob-canton"
                      value={canton}
                      onChange={(e) => setCanton(e.target.value)}
                      className={nativeSelect}
                    >
                      {CANTONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="ob-country" className={fieldLabel}>
                      Pays
                    </label>
                    <select
                      id="ob-country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className={nativeSelect}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <LiquidGlassButton type="submit" disabled={pending} className="mt-7 h-12 w-full rounded-xl text-sm">
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Continuer
                {!pending && <ArrowRight className="size-4" />}
              </LiquidGlassButton>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={onFormSubmit(goStep2)}>
              <h1 className="text-2xl font-semibold tracking-tight">Vos réglages de facturation</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Des valeurs par défaut sont déjà là — validez, c&apos;est prêt.
              </p>

              <div className="mt-6 space-y-5">
                <div>
                  <span className={fieldLabel}>Devise par défaut</span>
                  <div className="grid grid-cols-2 gap-2">
                    {["CHF", "EUR"].map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setCurrency(c)}
                        aria-pressed={currency === c}
                        className={`h-11 rounded-xl border text-sm font-medium transition-colors ${
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

                <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Assujetti à la TVA ?</p>
                    <p className="text-xs text-muted-foreground">Ajoute la TVA sur vos documents.</p>
                  </div>
                  <Switch checked={vatEnabled} onCheckedChange={setVatEnabled} />
                </div>

                {vatEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="ob-vatnum" className={fieldLabel}>
                        N° TVA
                      </label>
                      <Input
                        id="ob-vatnum"
                        value={vatNumber}
                        onChange={(e) => setVatNumber(e.target.value)}
                        placeholder="CHE-123.456.789"
                        className="h-11"
                      />
                    </div>
                    <div>
                      <label htmlFor="ob-vatrate" className={fieldLabel}>
                        Taux (%)
                      </label>
                      <Input
                        id="ob-vatrate"
                        inputMode="decimal"
                        value={vatRate}
                        onChange={(e) => setVatRate(e.target.value)}
                        className="h-11"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="ob-terms" className={fieldLabel}>
                    Délai de paiement (jours)
                  </label>
                  <Input
                    id="ob-terms"
                    inputMode="numeric"
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              <LiquidGlassButton type="submit" disabled={pending} className="mt-7 h-12 w-full rounded-xl text-sm">
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Continuer
                {!pending && <ArrowRight className="size-4" />}
              </LiquidGlassButton>
              <button
                type="button"
                onClick={goStep2}
                disabled={pending}
                className="mt-3 block w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Passer — garder les valeurs par défaut
              </button>
            </form>
          )}

          {step === 3 && (
            <div className="text-center">
              <AnimatedCheck />
              <h1 className="mt-6 text-2xl font-semibold tracking-tight">C&apos;est prêt</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Votre espace est prêt.</p>

              <div className="mt-8 space-y-3">
                <LiquidGlassButton
                  onClick={() => finish("/app/factures/nouvelle")}
                  disabled={pending}
                  className="h-12 w-full rounded-xl text-sm"
                >
                  {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Créer ma première facture
                </LiquidGlassButton>
                <button
                  type="button"
                  onClick={() => finish("/app")}
                  disabled={pending}
                  className="h-11 w-full rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Découvrir mon tableau de bord
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// Sober animated check — 400ms stroke draw, disabled under reduced-motion.
function AnimatedCheck() {
  return (
    <span className="mx-auto grid size-16 place-items-center rounded-full bg-success/12 text-success">
      <svg viewBox="0 0 24 24" fill="none" className="size-8" aria-hidden="true">
        <path
          d="M5 13l4 4L19 7"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="motion-safe:[stroke-dasharray:28] motion-safe:[stroke-dashoffset:28] motion-safe:animate-[fz-draw_400ms_ease-out_forwards]"
        />
      </svg>
      <span className="sr-only">Terminé</span>
    </span>
  );
}
