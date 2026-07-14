// Shared option lists for onboarding and settings. Kept in one place so the
// wizard and the settings screen never drift.

// Activity types — the labels double as STARTER_SERVICES keys (see
// lib/starter-services.ts); "Autre" falls back to the default pack.
export const ACTIVITY_TYPES = [
  "Design & création",
  "Conseil",
  "Artisanat",
  "Développement",
  "Coaching",
  "Autre",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

// Swiss cantons (French names), plus a neutral entry for non-CH.
export const CANTONS = [
  "Genève",
  "Vaud",
  "Valais",
  "Fribourg",
  "Neuchâtel",
  "Jura",
  "Berne",
  "Zurich",
  "Bâle-Ville",
  "Bâle-Campagne",
  "Argovie",
  "Lucerne",
  "Zoug",
  "Schwytz",
  "Uri",
  "Obwald",
  "Nidwald",
  "Glaris",
  "Soleure",
  "Schaffhouse",
  "Appenzell Rhodes-Extérieures",
  "Appenzell Rhodes-Intérieures",
  "Saint-Gall",
  "Grisons",
  "Thurgovie",
  "Tessin",
] as const;

export const COUNTRIES = [
  { code: "CH", label: "Suisse" },
  { code: "FR", label: "France" },
  { code: "DE", label: "Allemagne" },
  { code: "IT", label: "Italie" },
  { code: "AT", label: "Autriche" },
] as const;

export const DEFAULT_CANTON = "Genève";
export const DEFAULT_VAT_RATE = 8.1;
export const DEFAULT_PAYMENT_TERMS = 30;
