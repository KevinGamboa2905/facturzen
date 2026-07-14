// Single source of truth for plans & entitlements (PROMPT 10 §1).
// Nothing else in the codebase hardcodes a plan check — everything goes through
// can(user, feature) / limit(user, quota) / effectivePlan(user). Pure &
// isomorphic (no Prisma import) so it runs on client and server alike.

export type PlanId = "FREE" | "INDEP" | "STUDIO";

export type Feature =
  | "branding" // logo + branding on documents
  | "removeBranding" // remove "Propulsé par FacturZen"
  | "reminders" // automatic payment reminders
  | "onlineSignature" // online quote signature
  | "deposits" // deposit invoicing
  | "recurring" // recurring invoices
  | "onlinePayment" // collect payments online (Stripe)
  | "csvExport" // accounting CSV export
  | "multiUser" // shown "bientôt"
  | "api"; // shown "bientôt"

export type Quota = "invoicesPerMonth";

export type PlanDef = {
  id: PlanId;
  name: string;
  price: number; // CHF / month
  tagline: string;
  benefits: string[]; // short list for onboarding cards (max 4)
  features: Record<Feature, boolean>;
  quotas: Record<Quota, number>; // Infinity = unlimited
  recommended?: boolean;
  soon?: Feature[]; // features shown as "bientôt" rather than locked-upsell
};

const NONE: Record<Feature, boolean> = {
  branding: false,
  removeBranding: false,
  reminders: false,
  onlineSignature: false,
  deposits: false,
  recurring: false,
  onlinePayment: false,
  csvExport: false,
  multiUser: false,
  api: false,
};

const INDEP_FEATURES: Record<Feature, boolean> = {
  ...NONE,
  branding: true,
  reminders: true,
  onlineSignature: true,
  deposits: true,
  recurring: true,
  onlinePayment: true,
};

export const PLANS: Record<PlanId, PlanDef> = {
  FREE: {
    id: "FREE",
    name: "Libre",
    price: 0,
    tagline: "Pour démarrer sans risque.",
    benefits: ["3 factures par mois", "QR-facture conforme", "Devis & clients illimités", "Export PDF"],
    features: { ...NONE },
    quotas: { invoicesPerMonth: 3 },
  },
  INDEP: {
    id: "INDEP",
    name: "Indépendant",
    price: 24,
    tagline: "Pour être payé à temps, chaque mois.",
    benefits: ["Factures illimitées", "Relances automatiques", "Votre logo sur les documents", "Paiement en ligne"],
    features: { ...INDEP_FEATURES },
    quotas: { invoicesPerMonth: Infinity },
    recommended: true,
  },
  STUDIO: {
    id: "STUDIO",
    name: "Studio",
    price: 49,
    tagline: "Pour une équipe qui facture à plusieurs.",
    benefits: ["Tout Indépendant", "Export comptable (CSV)", "Sans « Propulsé par FacturZen »", "Multi-utilisateurs (bientôt)"],
    features: { ...INDEP_FEATURES, csvExport: true, removeBranding: true },
    quotas: { invoicesPerMonth: Infinity },
    soon: ["multiUser", "api"],
  },
};

export const PLAN_ORDER: PlanId[] = ["FREE", "INDEP", "STUDIO"];

// Minimal shape the entitlement helpers need from a user row.
export type PlanUser = {
  plan: string;
  trialEndsAt: Date | null;
  stripeSubscriptionId: string | null;
};

// Map any stored value (incl. legacy "PRO") to a known plan id.
export function normalizePlan(plan: string | null | undefined): PlanId {
  switch (plan) {
    case "INDEP":
    case "STUDIO":
      return plan;
    case "PRO": // legacy
      return "INDEP";
    default:
      return "FREE";
  }
}

// The plan actually in force. A trial (INDEP/STUDIO with trialEndsAt, no paid
// subscription) that has expired softly falls back to FREE — never a hard block.
export function effectivePlan(user: PlanUser): PlanId {
  const id = normalizePlan(user.plan);
  if (id === "FREE") return "FREE";
  if (user.stripeSubscriptionId) return id; // paid
  if (user.trialEndsAt && user.trialEndsAt.getTime() < Date.now()) return "FREE"; // trial ended
  return id; // trialing
}

export function isOnTrial(user: PlanUser): boolean {
  const id = normalizePlan(user.plan);
  return (
    id !== "FREE" &&
    !user.stripeSubscriptionId &&
    !!user.trialEndsAt &&
    user.trialEndsAt.getTime() >= Date.now()
  );
}

export function trialDaysLeft(user: PlanUser): number | null {
  if (!isOnTrial(user) || !user.trialEndsAt) return null;
  return Math.max(0, Math.ceil((user.trialEndsAt.getTime() - Date.now()) / 86_400_000));
}

export function trialExpired(user: PlanUser): boolean {
  const id = normalizePlan(user.plan);
  return (
    id !== "FREE" &&
    !user.stripeSubscriptionId &&
    !!user.trialEndsAt &&
    user.trialEndsAt.getTime() < Date.now()
  );
}

export function can(user: PlanUser, feature: Feature): boolean {
  return PLANS[effectivePlan(user)].features[feature];
}

export function limit(user: PlanUser, quota: Quota): number {
  return PLANS[effectivePlan(user)].quotas[quota];
}

// Lowest plan that unlocks a feature — powers "Inclus dans Indépendant" tooltips.
export function requiredPlanFor(feature: Feature): PlanId {
  return PLAN_ORDER.find((id) => PLANS[id].features[feature]) ?? "STUDIO";
}

export function planName(id: PlanId): string {
  return PLANS[id].name;
}

// Can this user still SEND an invoice this month? (quota enforced on send only.)
export function canSendInvoice(user: PlanUser, sentThisMonth: number): boolean {
  return sentThisMonth < limit(user, "invoicesPerMonth");
}
