import { BadgeCheck, Ban, CircleDollarSign, PencilLine, Send, TriangleAlert } from "lucide-react";

import type { StatusMeta } from "@/lib/status";

// The ONE place that decides an invoice's displayed status (PROMPT 6). Used by
// the list, detail, dashboard and public pages. "Payée" (green) appears only
// when amountPaid >= total — never on a deposit alone.
export type InvoiceForStatus = {
  status: string; // stored: DRAFT | SENT | PAID | OVERDUE | CANCELLED
  amountPaid: number; // centimes collected
  total: number; // centimes
  depositPercent: number | null;
  dueDate: Date;
  hasBalanceInvoice?: boolean;
};

export function depositAmountOf(total: number, depositPercent: number | null): number {
  return depositPercent ? Math.round((total * depositPercent) / 100) : 0;
}

export type DisplayStatus = StatusMeta & { key: string };

export function getInvoiceDisplayStatus(inv: InvoiceForStatus, now: Date = new Date()): DisplayStatus {
  if (inv.status === "CANCELLED") return { key: "CANCELLED", label: "Annulée", tone: "neutral", icon: Ban };
  if (inv.status === "DRAFT") return { key: "DRAFT", label: "Brouillon", tone: "neutral", icon: PencilLine };

  if (inv.total > 0 && inv.amountPaid >= inv.total) {
    return { key: "PAID", label: "Payée", tone: "success", icon: BadgeCheck };
  }

  const deposit = depositAmountOf(inv.total, inv.depositPercent);
  if (deposit > 0 && inv.amountPaid >= deposit) {
    return inv.hasBalanceInvoice
      ? { key: "DEPOSIT_PAID_BALANCE", label: "Acompte payé · Solde envoyé", tone: "warning", icon: CircleDollarSign }
      : { key: "DEPOSIT_PAID", label: "Acompte payé", tone: "warning", icon: CircleDollarSign };
  }

  if (inv.dueDate.getTime() < now.getTime()) {
    return { key: "OVERDUE", label: "En retard", tone: "danger", icon: TriangleAlert };
  }
  return { key: "SENT", label: "Envoyée", tone: "info", icon: Send };
}
