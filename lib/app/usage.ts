import "server-only";

import { prisma } from "@/lib/prisma";

// Calendar-month boundaries [start, nextMonthStart).
export function monthRange(now = new Date()) {
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

// Invoices actually SENT this calendar month — computed from the DB (Invoice.sentAt),
// never an incremented counter, so it can't drift (PROMPT 10 §1).
export async function sentInvoicesThisMonth(userId: string, now = new Date()): Promise<number> {
  const { start, end } = monthRange(now);
  return prisma.invoice.count({ where: { userId, sentAt: { gte: start, lt: end } } });
}

export function monthLabel(now = new Date()): string {
  return new Intl.DateTimeFormat("fr-CH", { month: "long" }).format(now);
}
