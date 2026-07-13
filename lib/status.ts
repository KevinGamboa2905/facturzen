import type { LucideIcon } from "lucide-react";
import {
  Ban,
  BadgeCheck,
  CheckCircle2,
  Clock,
  PencilLine,
  Send,
  TriangleAlert,
  XCircle,
} from "lucide-react";

/**
 * Status tone → semantic color token. Colors are never used alone (§3.7): the
 * badge always pairs a tone with a French label and an icon.
 */
export type StatusTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

export type QuoteStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "DECLINED"
  | "EXPIRED";

export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

export type AnyStatus = QuoteStatus | InvoiceStatus;

export type StatusMeta = {
  label: string;
  tone: StatusTone;
  icon: LucideIcon;
};

export const QUOTE_STATUS: Record<QuoteStatus, StatusMeta> = {
  DRAFT: { label: "Brouillon", tone: "neutral", icon: PencilLine },
  SENT: { label: "Envoyé", tone: "info", icon: Send },
  ACCEPTED: { label: "Accepté", tone: "success", icon: CheckCircle2 },
  DECLINED: { label: "Refusé", tone: "danger", icon: XCircle },
  EXPIRED: { label: "Expiré", tone: "warning", icon: Clock },
};

export const INVOICE_STATUS: Record<InvoiceStatus, StatusMeta> = {
  DRAFT: { label: "Brouillon", tone: "neutral", icon: PencilLine },
  SENT: { label: "Envoyée", tone: "info", icon: Send },
  PAID: { label: "Payée", tone: "success", icon: BadgeCheck },
  OVERDUE: { label: "En retard", tone: "danger", icon: TriangleAlert },
  CANCELLED: { label: "Annulée", tone: "neutral", icon: Ban },
};

export function quoteStatusMeta(status: QuoteStatus): StatusMeta {
  return QUOTE_STATUS[status];
}

export function invoiceStatusMeta(status: InvoiceStatus): StatusMeta {
  return INVOICE_STATUS[status];
}
