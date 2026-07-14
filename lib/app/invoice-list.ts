import type { WorkspaceData } from "@/lib/workspace";
import { computeTotals, type Totals } from "@/lib/totals";
import { getInvoiceDisplayStatus, type DisplayStatus } from "@/lib/app/invoice-status";

const STATUS_KEYS: Record<string, string[] | undefined> = {
  all: undefined,
  paid: ["PAID"],
  acompte: ["DEPOSIT_PAID", "DEPOSIT_PAID_BALANCE"],
  sent: ["SENT"],
  overdue: ["OVERDUE"],
};

export type InvoiceRow = {
  inv: WorkspaceData["invoices"][number];
  totals: Totals;
  ds: DisplayStatus;
};

// Shared filter+sort for the invoices list and the CSV export, so both always
// agree on what the current view contains (§4/§7).
export function buildInvoiceRows(
  invoices: WorkspaceData["invoices"],
  opts: { statut?: string; q?: string; sort?: string },
): InvoiceRow[] {
  const keys = STATUS_KEYS[opts.statut ?? "all"];
  const query = (opts.q ?? "").trim().toLowerCase();
  const sort = opts.sort ?? "date";

  let rows: InvoiceRow[] = invoices.map((inv) => {
    const totals = computeTotals(inv.lineItems);
    const ds = getInvoiceDisplayStatus({
      status: inv.status,
      amountPaid: inv.amountPaid,
      total: totals.ttc,
      depositPercent: inv.depositPercent,
      dueDate: inv.dueDate,
      hasBalanceInvoice: inv.balances.length > 0,
    });
    return { inv, totals, ds };
  });

  if (keys) rows = rows.filter((r) => keys.includes(r.ds.key));
  if (query) {
    rows = rows.filter(
      (r) =>
        r.inv.number.toLowerCase().includes(query) ||
        (r.inv.client?.name ?? "").toLowerCase().includes(query) ||
        r.inv.lineItems.some((li) => li.label.toLowerCase().includes(query)),
    );
  }
  rows.sort((a, b) => {
    if (sort === "amount") return b.totals.ttc - a.totals.ttc;
    if (sort === "status") return a.ds.key.localeCompare(b.ds.key);
    return b.inv.issueDate.getTime() - a.inv.issueDate.getTime();
  });
  return rows;
}
