import Link from "next/link";
import { CreditCard } from "lucide-react";

import { ensureDemoWorkspace, getDemoData } from "@/lib/demo/session";
import { LiquidGlassButton } from "@/components/ui/liquid-glass";

export const dynamic = "force-dynamic";

export default async function DemoSettingsPage() {
  const user = await ensureDemoWorkspace();
  const data = user ? await getDemoData(user.id) : null;
  if (!data) return null;
  const u = data.user;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">Réglages</h1>

      <div className="mt-5 space-y-4">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-medium">Profil entreprise</h2>
          <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Activité</dt>
              <dd>{u.companyName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">QR-IBAN</dt>
              <dd className="tabular-nums">{u.iban}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">TVA</dt>
              <dd>{u.vatNumber}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Délai de paiement</dt>
              <dd>{u.paymentTermsDays} jours</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <CreditCard className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">Abonnement</h2>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            L&apos;abonnement se gère depuis un compte réel.
          </p>
          <LiquidGlassButton href="/connexion" className="mt-4 h-10 rounded-xl px-4 text-sm">
            Créer mon compte
          </LiquidGlassButton>
        </section>
      </div>
    </div>
  );
}
