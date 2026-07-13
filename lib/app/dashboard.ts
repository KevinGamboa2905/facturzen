import { computeTotals } from "@/lib/totals";

export type DashInvoice = {
  id: string;
  number: string;
  status: string;
  currency: string;
  amountPaid: number;
  depositPercent: number | null;
  issueDate: Date;
  dueDate: Date;
  paidAt: Date | null;
  quoteId: string | null;
  client: { name: string } | null;
  lineItems: { quantity: number; unitPrice: number; vatRate: number }[];
  reminders: { level: number; tone: string; scheduledAt: Date; sentAt: Date | null }[];
  balances: { id: string }[];
};

export type DashQuote = { id: string; status: string; convertedInvoiceId: string | null };

export function invoiceTotalTtc(inv: { lineItems: DashInvoice["lineItems"] }): number {
  return computeTotals(inv.lineItems).ttc;
}

const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

// Every figure here is derived from the invoice/quote records, so the dashboard
// stat cards always equal the sum of the seed (acceptance criterion).
export function computeDashboard(invoices: DashInvoice[], quotes: DashQuote[], now = new Date()) {
  let paidChf = 0;
  let paidEur = 0;
  let pendingChf = 0;
  let overdueChf = 0;

  for (const inv of invoices) {
    const total = invoiceTotalTtc(inv);
    const eur = inv.currency === "EUR";
    // Encaissé = real cash collected (includes deposits).
    if (eur) paidEur += inv.amountPaid;
    else paidChf += inv.amountPaid;

    // Outstanding = total − collected, split by due date (never double-counts).
    const outstanding = total - inv.amountPaid;
    if (!eur && outstanding > 0 && inv.status !== "DRAFT" && inv.status !== "CANCELLED") {
      if (inv.dueDate.getTime() < now.getTime()) overdueChf += outstanding;
      else pendingChf += outstanding;
    }
  }

  const quotesToConvert = quotes.filter((q) => q.status === "ACCEPTED" && !q.convertedInvoiceId).length;

  // Trailing 12 months of collected revenue (CHF), by paid month.
  const base = new Date(now.getFullYear(), now.getMonth(), 1);
  const fmt = new Intl.DateTimeFormat("fr-CH", { month: "short" });
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(base.getFullYear(), base.getMonth() - (11 - i), 1);
    return {
      key: monthKey(d),
      label: fmt.format(d).replace(".", ""),
      total: 0,
    };
  });
  const idx = new Map(months.map((m, i) => [m.key, i]));
  for (const inv of invoices) {
    if (inv.currency === "EUR" || !inv.paidAt || inv.amountPaid <= 0) continue;
    const i = idx.get(monthKey(inv.paidAt));
    if (i == null) continue;
    months[i].total += inv.amountPaid;
  }

  const recent = [...invoices]
    .sort((a, b) => b.issueDate.getTime() - a.issueDate.getTime())
    .slice(0, 5)
    .map((inv) => ({
      id: inv.id,
      number: inv.number,
      client: inv.client?.name ?? "Sans client",
      status: inv.status,
      currency: inv.currency,
      total: invoiceTotalTtc(inv),
      amountPaid: inv.amountPaid,
      depositPercent: inv.depositPercent,
      dueDate: inv.dueDate,
      hasBalanceInvoice: inv.balances.length > 0,
      issueDate: inv.issueDate,
    }));

  let latestReminder: {
    sentAt: Date;
    level: number;
    tone: string;
    client: string;
    number: string;
    id: string;
  } | null = null;
  for (const inv of invoices) {
    for (const r of inv.reminders) {
      if (r.sentAt && (!latestReminder || r.sentAt > latestReminder.sentAt)) {
        latestReminder = {
          sentAt: r.sentAt,
          level: r.level,
          tone: r.tone,
          client: inv.client?.name ?? "Sans client",
          number: inv.number,
          id: inv.id,
        };
      }
    }
  }

  return { paidChf, paidEur, pendingChf, overdueChf, quotesToConvert, months, recent, latestReminder };
}
