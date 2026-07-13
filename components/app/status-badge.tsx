import { cn } from "@/lib/utils";
import {
  invoiceStatusMeta,
  quoteStatusMeta,
  type InvoiceStatus,
  type QuoteStatus,
  type StatusTone,
} from "@/lib/status";
import { getInvoiceDisplayStatus, type InvoiceForStatus } from "@/lib/app/invoice-status";

// Tone → color pair. Never color alone (§3.7): every badge carries icon + label.
const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-info/15 text-info",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/15 text-destructive",
};

function StatusBadge({
  label,
  tone,
  icon: Icon,
  className,
  pulse = false,
}: {
  label: string;
  tone: StatusTone;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
    >
      {pulse && (
        <span className="relative flex size-1.5" aria-hidden="true">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      )}
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

export function InvoiceStatusBadge({ status, className }: { status: InvoiceStatus; className?: string }) {
  const meta = invoiceStatusMeta(status);
  return <StatusBadge label={meta.label} tone={meta.tone} icon={meta.icon} className={className} />;
}

// Derived badge — the single source of truth for what an invoice shows (PROMPT 6).
export function DisplayInvoiceBadge({ invoice, className }: { invoice: InvoiceForStatus; className?: string }) {
  const meta = getInvoiceDisplayStatus(invoice);
  return (
    <StatusBadge
      label={meta.label}
      tone={meta.tone}
      icon={meta.icon}
      className={cn(meta.key === "CANCELLED" && "line-through", className)}
    />
  );
}

export function QuoteStatusBadge({
  status,
  className,
  pulse,
  label,
}: {
  status: QuoteStatus;
  className?: string;
  pulse?: boolean;
  label?: string;
}) {
  const meta = quoteStatusMeta(status);
  return (
    <StatusBadge label={label ?? meta.label} tone={meta.tone} icon={meta.icon} className={className} pulse={pulse} />
  );
}
