import { formatNumberShort } from "@/lib/money";

// Service unit types (§1). Stored as String for Postgres portability.
export type UnitType = "HOUR" | "DAY" | "FLAT" | "UNIT" | "WORD" | "PAGE";

export const UNIT_TYPES: { value: UnitType; label: string; suffix: string }[] = [
  { value: "HOUR", label: "Heure", suffix: "/ heure" },
  { value: "DAY", label: "Jour", suffix: "/ jour" },
  { value: "FLAT", label: "Forfait", suffix: "forfait" },
  { value: "UNIT", label: "Unité", suffix: "/ unité" },
  { value: "WORD", label: "Mot", suffix: "/ mot" },
  { value: "PAGE", label: "Page", suffix: "/ page" },
];

export function unitSuffix(unitType: string): string {
  return UNIT_TYPES.find((u) => u.value === unitType)?.suffix ?? "";
}

// Compact catalogue price, e.g. "120 CHF / heure" or "1'800 CHF forfait".
export function formatServicePrice(cents: number, currency: string, unitType: string): string {
  return `${formatNumberShort(cents)} ${currency} ${unitSuffix(unitType)}`.trim();
}
