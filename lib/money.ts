/**
 * Money is stored and computed in integer centimes (§4) — never floats.
 *
 * Formatting is deterministic (not `Intl`): Node's ICU and the browser's ICU
 * can emit different Swiss group separators, which breaks React hydration when
 * a number is rendered inside an SSR-ed client component. We format by hand to
 * the Swiss convention (apostrophe thousands, dot decimals) so server === client.
 */
export type Currency = "CHF" | "EUR";

function groupSwiss(intDigits: string): string {
  return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

function formatCents(cents: number, minDecimals: number, maxDecimals: number): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const intPart = Math.floor(abs / 100);
  const rawDec = (abs % 100).toString().padStart(2, "0");

  let decimals = "";
  if (maxDecimals > 0) {
    if (minDecimals > 0 || rawDec !== "00") decimals = "." + rawDec;
  }

  return `${negative ? "-" : ""}${groupSwiss(intPart.toString())}${decimals}`;
}

/** e.g. 123450 → "1'234.50 CHF". */
export function formatAmount(cents: number, currency: Currency = "CHF"): string {
  return `${formatCents(cents, 2, 2)} ${currency}`;
}

/** Without the currency symbol, e.g. 123450 → "1'234.50". */
export function formatAmountPlain(cents: number): string {
  return formatCents(cents, 2, 2);
}

/** Compact number, drops trailing ".00", e.g. 180000 → "1'800", 4550 → "45.50". */
export function formatNumberShort(cents: number): string {
  return formatCents(cents, 0, 2);
}
