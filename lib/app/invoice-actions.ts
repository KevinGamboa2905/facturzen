// Single source of truth for which actions an invoice offers (PROMPT 12 §1).
// Used by the detail view AND the list so they can never disagree — notably:
// a sent invoice can always be marked paid *even once overdue* (the most common
// real-life case), and a deposit invoice can be balanced regardless of due date.

export type InvoiceActionInput = {
  status: string;
  amountPaid: number;
  total: number;
  depositPercent: number | null;
  dueDate: Date | string | null;
  hasBalanceInvoice: boolean;
};

export type InvoiceActions = {
  paid: boolean;
  cancelled: boolean;
  partial: boolean; // a deposit is collected but not the full total
  overdue: boolean;
  canRemind: boolean;
  canMarkPaid: boolean;
  markPaidLabel: string;
  canMarkDepositPaid: boolean;
  canInvoiceBalance: boolean;
  // Which action is the single primary button; the rest render as secondary.
  primary: "remind" | "balance" | "markPaid" | null;
};

export function getInvoiceActions(inv: InvoiceActionInput): InvoiceActions {
  const cancelled = inv.status === "CANCELLED";
  const paid = inv.total > 0 && inv.amountPaid >= inv.total;
  const partial = inv.amountPaid > 0 && inv.amountPaid < inv.total;
  const due = inv.dueDate ? new Date(inv.dueDate) : null;
  const overdue = !paid && !cancelled && due != null && due.getTime() < Date.now();

  const canRemind = !paid && !cancelled && overdue;
  // Payable whenever it isn't already paid or cancelled — overdue included.
  const canMarkPaid = !paid && !cancelled;
  const canMarkDepositPaid = !paid && !cancelled && !partial && !!inv.depositPercent;
  // Balance the deposit regardless of overdue status.
  const canInvoiceBalance =
    !paid && !cancelled && partial && !!inv.depositPercent && !inv.hasBalanceInvoice;

  // Recovery-first hierarchy: overdue → remind is primary (mark-paid stays a
  // secondary right next to it). Otherwise balance, else mark-paid.
  const primary: InvoiceActions["primary"] = overdue
    ? "remind"
    : canInvoiceBalance
      ? "balance"
      : canMarkPaid
        ? "markPaid"
        : null;

  return {
    paid,
    cancelled,
    partial,
    overdue,
    canRemind,
    canMarkPaid,
    markPaidLabel: partial ? "Marquer le solde payé" : "Marquer payée",
    canMarkDepositPaid,
    canInvoiceBalance,
    primary,
  };
}
