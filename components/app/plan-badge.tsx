import { PLANS, type PlanId } from "@/lib/plans";

// Plan chip shown by the name (sidebar/dashboard). During a trial it shows the
// countdown instead of the plan name.
export function PlanBadge({
  plan,
  trialDaysLeft,
  className = "",
}: {
  plan: PlanId;
  trialDaysLeft?: number | null;
  className?: string;
}) {
  const trialing = trialDaysLeft != null;
  const label = trialing
    ? `Essai · ${trialDaysLeft} j`
    : PLANS[plan].name;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        trialing
          ? "border-accent/40 bg-accent/10 text-foreground"
          : plan === "FREE"
            ? "border-border text-muted-foreground"
            : "border-accent/40 bg-accent/10 text-foreground"
      } ${className}`}
    >
      {label}
    </span>
  );
}
