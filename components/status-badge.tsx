import { cn } from "@/lib/utils";
import type { StatusMeta, StatusTone } from "@/lib/status";

// Soft-tinted badge: token-based background + foreground, never a raw hex (§2).
const toneClasses: Record<StatusTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
};

export function StatusBadge({
  meta,
  className,
}: {
  meta: StatusMeta;
  className?: string;
}) {
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        toneClasses[meta.tone],
        className,
      )}
    >
      {/* Icon reinforces the status so meaning never relies on color alone (§3.7). */}
      <Icon className="size-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  );
}
