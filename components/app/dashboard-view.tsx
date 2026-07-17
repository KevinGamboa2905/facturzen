import Link from "next/link";
import {
  ArrowUpRight,
  BellRing,
  Clock,
  FileSignature,
  TriangleAlert,
  Wallet,
} from "lucide-react";

import type { WorkspaceData } from "@/lib/workspace";
import { computeDashboard } from "@/lib/app/dashboard";
import type { ChecklistItem } from "@/lib/app/checklist";
import { formatAmount } from "@/lib/money";
import { DisplayInvoiceBadge } from "@/components/app/status-badge";
import { RevenueChart } from "@/components/app/revenue-chart";
import { ActivationChecklist } from "@/components/app/activation-checklist";
import { PlanUsageBar, ChoosePlanNudge } from "@/components/app/plan-usage";

export type PlanUsage = {
  isFree: boolean;
  sentThisMonth: number;
  invoiceLimit: number;
  monthLabel: string;
  showNudge: boolean;
};

function StatCard({
  label,
  value,
  sub,
  href,
  icon: Icon,
  tone = "default",
  tourId,
}: {
  label: string;
  value: string;
  sub?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "warning" | "danger";
  tourId?: string;
}) {
  const accent =
    tone === "danger" ? "text-destructive" : tone === "warning" ? "text-warning" : "text-muted-foreground";
  return (
    <Link
      href={href}
      prefetch
      data-tour={tourId}
      className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-muted-foreground/40"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={`size-4 ${accent}`} />
      </div>
      <span className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
      <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
        {sub ?? "Voir le détail"}
        <ArrowUpRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
    </Link>
  );
}

function daysSince(date: Date, now = new Date()) {
  return Math.max(0, Math.round((now.getTime() - date.getTime()) / 86_400_000));
}

// Shared dashboard for /app and /demo. Same data shape, links keyed by basePath.
// The activation checklist is optional (shown for real accounts still ramping up).
export function DashboardView({
  basePath,
  data,
  checklist,
  planUsage,
}: {
  basePath: string;
  data: WorkspaceData;
  checklist?: { items: ChecklistItem[]; done: number; total: number } | null;
  planUsage?: PlanUsage | null;
}) {
  const { invoices, quotes } = data;
  const d = computeDashboard(invoices, quotes);
  const firstName = data.user.name?.split(" ")[0] ?? "vous";
  const hasData = invoices.length > 0 || quotes.length > 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bonjour {firstName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasData
              ? "Voici où en est votre activité aujourd'hui."
              : "Bienvenue — voici votre espace. Créez votre première facture pour le voir prendre vie."}
          </p>
        </div>
      </header>

      {planUsage?.showNudge && (
        <div className="mt-6">
          <ChoosePlanNudge />
        </div>
      )}

      {checklist && checklist.done < checklist.total && (
        <div className="mt-6">
          <ActivationChecklist items={checklist.items} done={checklist.done} total={checklist.total} />
        </div>
      )}

      {planUsage?.isFree && planUsage.invoiceLimit !== Infinity && (
        <div className="mt-6">
          <PlanUsageBar
            sentThisMonth={planUsage.sentThisMonth}
            invoiceLimit={planUsage.invoiceLimit}
            monthLabel={planUsage.monthLabel}
          />
        </div>
      )}

      {/* Stat cards */}
      <section
        aria-label="Chiffres clés"
        data-tour="stats"
        className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label="Encaissé cette année"
          value={formatAmount(d.paidChf)}
          sub={d.paidEur > 0 ? `+ ${formatAmount(d.paidEur, "EUR")} encaissés` : undefined}
          href={`${basePath}/factures?statut=paid`}
          icon={Wallet}
        />
        <StatCard
          label="En attente"
          value={formatAmount(d.pendingChf)}
          href={`${basePath}/factures?statut=sent`}
          icon={Clock}
        />
        <StatCard
          label="En retard"
          value={formatAmount(d.overdueChf)}
          sub={d.overdueChf > 0 ? "Relances automatiques en cours" : undefined}
          href={`${basePath}/factures?statut=overdue`}
          icon={TriangleAlert}
          tone="danger"
          tourId="overdue"
        />
        <StatCard
          label="Devis à convertir"
          value={String(d.quotesToConvert)}
          sub="Accepté, prêt à facturer"
          href={`${basePath}/devis?statut=accepted`}
          icon={FileSignature}
          tourId="quote"
        />
      </section>

      {/* Chart + reminders */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Chiffre d&apos;affaires encaissé</h2>
            <span className="text-xs text-muted-foreground">12 derniers mois</span>
          </div>
          <div className="mt-4">
            <RevenueChart data={d.months} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-success/15 text-success">
              <BellRing className="size-4" />
            </span>
            <h2 className="text-sm font-medium">Relances en cours</h2>
          </div>
          {d.latestReminder ? (
            <div className="mt-4">
              <p className="text-sm text-foreground">
                Facty a relancé <span className="font-medium">{d.latestReminder.client}</span> il y a{" "}
                {daysSince(d.latestReminder.sentAt)} jours — sans que {firstName} ait à écrire un seul mot.
              </p>
              <Link
                href={`${basePath}/factures?statut=overdue`}
                prefetch
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-info transition-colors hover:text-info/80"
              >
                Voir l&apos;email de relance
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Aucune relance en cours. Les factures en retard sont relancées automatiquement.
            </p>
          )}
        </div>
      </section>

      {/* Recent invoices */}
      <section className="mt-4 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-medium">Dernières factures</h2>
          <Link
            href={`${basePath}/factures`}
            prefetch
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Tout voir
          </Link>
        </div>
        {d.recent.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Vos factures apparaîtront ici.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {d.recent.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`${basePath}/factures/${inv.id}`}
                  prefetch
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{inv.client}</p>
                    <p className="truncate text-xs text-muted-foreground tabular-nums">{inv.number}</p>
                  </div>
                  <DisplayInvoiceBadge
                    invoice={{
                      status: inv.status,
                      amountPaid: inv.amountPaid,
                      total: inv.total,
                      depositPercent: inv.depositPercent,
                      dueDate: inv.dueDate,
                      hasBalanceInvoice: inv.hasBalanceInvoice,
                    }}
                  />
                  <span className="w-28 shrink-0 text-right text-sm font-medium tabular-nums">
                    {formatAmount(inv.total, inv.currency as "CHF" | "EUR")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
