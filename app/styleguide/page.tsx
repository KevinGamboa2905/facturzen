import type { Metadata } from "next";
import { ArrowRight, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/status-badge";
import { INVOICE_STATUS, QUOTE_STATUS } from "@/lib/status";
import { formatAmount } from "@/lib/money";

export const metadata: Metadata = {
  title: "Design system",
  description: "Démonstration des tokens FacturZen — couleurs, typographie, boutons, badges.",
};

const colorTokens: { name: string; token: string; hex: string; usage: string }[] = [
  { name: "Background", token: "--background", hex: "#F8FAFC", usage: "Fond de l'app" },
  { name: "Foreground", token: "--foreground", hex: "#0F172A", usage: "Texte principal (navy)" },
  { name: "Card", token: "--card", hex: "#FFFFFF", usage: "Cartes, surfaces" },
  { name: "Primary", token: "--primary", hex: "#0F172A", usage: "Boutons primaires, nav" },
  { name: "Accent", token: "--accent", hex: "#2563EB", usage: "Liens, états actifs, CTA" },
  { name: "Muted", token: "--muted", hex: "#EEF2F6", usage: "Fonds atténués, hover" },
  { name: "Muted foreground", token: "--muted-foreground", hex: "#64748B", usage: "Texte secondaire" },
  { name: "Border", token: "--border", hex: "#E2E8F0", usage: "Bordures, séparateurs" },
  { name: "Destructive", token: "--destructive", hex: "#DC2626", usage: "Suppression, en retard" },
  { name: "Success", token: "--success", hex: "#059669", usage: "Payé, devis accepté" },
  { name: "Warning", token: "--warning", hex: "#D97706", usage: "En attente, échéance proche" },
  { name: "Ring", token: "--ring", hex: "#2563EB", usage: "Focus rings" },
];

const typeScale: { size: string; px: string; sample: string }[] = [
  { size: "text-5xl", px: "48px", sample: "Facturez en 2 minutes" },
  { size: "text-3xl", px: "32px", sample: "Soyez payé à temps" },
  { size: "text-2xl", px: "24px", sample: "Tableau de bord" },
  { size: "text-lg", px: "18px", sample: "Sous-titre de section" },
  { size: "text-base", px: "16px", sample: "Corps de texte — 16px minimum, interligne 1.6." },
  { size: "text-sm", px: "14px", sample: "Libellés et métadonnées secondaires." },
  { size: "text-xs", px: "12px", sample: "Mentions légales et annotations." },
];

function Swatch({ hex, token }: { hex: string; token: string }) {
  return (
    <div
      className="size-14 shrink-0 rounded-lg border border-border"
      style={{ backgroundColor: `var(${token})` }}
      aria-hidden="true"
      title={hex}
    />
  );
}

export default function StyleguidePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-16">
      <header className="mb-12">
        <p className="mb-2 text-sm font-medium text-accent">FacturZen · Design system</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
          Tokens &amp; composants
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Source de vérité visuelle. Style flat, minimal, épuré : beaucoup de blanc, deux
          couleurs de marque (navy + bleu), le reste sémantique. Aucun hex en dur dans les
          composants — uniquement des tokens.
        </p>
      </header>

      {/* Colors */}
      <section className="mb-16" aria-labelledby="colors-heading">
        <h2 id="colors-heading" className="mb-6 text-2xl font-semibold">
          Couleurs
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {colorTokens.map((c) => (
            <div
              key={c.token}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
            >
              <Swatch hex={c.hex} token={c.token} />
              <div className="min-w-0">
                <p className="font-medium">{c.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{c.token}</p>
                <p className="mt-1 text-sm text-muted-foreground">{c.usage}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="mb-16" aria-labelledby="type-heading">
        <h2 id="type-heading" className="mb-6 text-2xl font-semibold">
          Typographie — Poppins
        </h2>
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {typeScale.map((t) => (
              <div
                key={t.size}
                className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-baseline sm:gap-6"
              >
                <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
                  {t.px}
                </span>
                <span className={`${t.size} font-semibold leading-tight`}>{t.sample}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Graisses</CardTitle>
              <CardDescription>Hiérarchie par le poids, pas la décoration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-normal">Regular 400 — corps de texte</p>
              <p className="font-medium">Medium 500 — libellés</p>
              <p className="font-semibold">Semibold 600 — titres</p>
              <p className="font-bold">Bold 700 — grands titres</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Chiffres tabulaires</CardTitle>
              <CardDescription>
                Obligatoire sur tout montant (tableaux, totaux, dashboard).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-lg">
              <div className="flex justify-between tabular-nums">
                <span className="text-muted-foreground">Total HT</span>
                <span className="font-medium">{formatAmount(1234500)}</span>
              </div>
              <div className="flex justify-between tabular-nums">
                <span className="text-muted-foreground">TVA 8.1 %</span>
                <span className="font-medium">{formatAmount(99995)}</span>
              </div>
              <Separator />
              <div className="flex justify-between tabular-nums">
                <span className="font-semibold">Total TTC</span>
                <span className="font-semibold">{formatAmount(1334495)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Buttons */}
      <section className="mb-16" aria-labelledby="buttons-heading">
        <h2 id="buttons-heading" className="mb-6 text-2xl font-semibold">
          Boutons
        </h2>
        <Card>
          <CardContent className="flex flex-col gap-6 p-6">
            <div>
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                CTA principal (≥ 44px, un seul par écran)
              </p>
              <Button className="h-11 bg-accent px-6 text-base text-accent-foreground hover:bg-accent/90">
                Créer ma première facture
                <ArrowRight />
              </Button>
            </div>
            <Separator />
            <div>
              <p className="mb-3 text-sm font-medium text-muted-foreground">Variantes</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button className="h-10">Primaire</Button>
                <Button variant="secondary" className="h-10">
                  Secondaire
                </Button>
                <Button variant="outline" className="h-10">
                  Contour
                </Button>
                <Button variant="ghost" className="h-10">
                  Ghost
                </Button>
                <Button variant="link">Lien</Button>
                <Button variant="destructive" className="h-10">
                  <Trash2 />
                  Supprimer
                </Button>
              </div>
            </div>
            <Separator />
            <div>
              <p className="mb-3 text-sm font-medium text-muted-foreground">États</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button className="h-10">
                  <Plus />
                  Nouveau devis
                </Button>
                <Button className="h-10" disabled>
                  Désactivé
                </Button>
                <Button className="h-10" disabled>
                  <span className="mr-1 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Chargement…
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Status badges */}
      <section className="mb-16" aria-labelledby="badges-heading">
        <h2 id="badges-heading" className="mb-6 text-2xl font-semibold">
          Badges de statut
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Devis</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {Object.values(QUOTE_STATUS).map((meta) => (
                <StatusBadge key={meta.label} meta={meta} />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Factures</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {Object.values(INVOICE_STATUS).map((meta) => (
                <StatusBadge key={meta.label} meta={meta} />
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Form controls */}
      <section aria-labelledby="forms-heading">
        <h2 id="forms-heading" className="mb-6 text-2xl font-semibold">
          Champs de formulaire
        </h2>
        <Card>
          <CardContent className="grid gap-6 p-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="demo-company">Raison sociale</Label>
              <Input id="demo-company" defaultValue="Atelier Rousseau Sàrl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demo-email">Adresse e-mail</Label>
              <Input id="demo-email" type="email" placeholder="vous@exemple.ch" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demo-iban">QR-IBAN</Label>
              <Input id="demo-iban" defaultValue="CH44 3199 9123 0008 8901 2" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demo-error">Champ en erreur</Label>
              <Input id="demo-error" aria-invalid defaultValue="montant-invalide" />
              <p className="text-xs text-destructive">
                Montant invalide — saisissez un nombre, par exemple 1250.00.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
