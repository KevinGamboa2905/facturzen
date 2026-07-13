// Document totals, computed in integer centimes (§4) — never floats.
// Shared by the dashboard, the builder and the PDF so every surface agrees.

export type TotalsInput = {
  quantity: number;
  unitPrice: number; // centimes
  vatRate: number; // percent, e.g. 8.1
};

export type Totals = {
  ht: number; // centimes
  vat: number; // centimes
  ttc: number; // centimes
  vatByRate: { rate: number; amount: number }[];
};

export function computeTotals(items: TotalsInput[], depositPercent?: number | null): Totals & {
  deposit: number;
} {
  let ht = 0;
  const byRate = new Map<number, number>();

  for (const item of items) {
    const line = Math.round(item.quantity * item.unitPrice);
    ht += line;
    const vat = Math.round((line * item.vatRate) / 100);
    byRate.set(item.vatRate, (byRate.get(item.vatRate) ?? 0) + vat);
  }

  const vat = [...byRate.values()].reduce((sum, v) => sum + v, 0);
  const ttc = ht + vat;
  const deposit = depositPercent ? Math.round((ttc * depositPercent) / 100) : 0;

  return {
    ht,
    vat,
    ttc,
    deposit,
    vatByRate: [...byRate.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([rate, amount]) => ({ rate, amount })),
  };
}
