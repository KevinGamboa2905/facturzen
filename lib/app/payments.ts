import "server-only";

import { prisma } from "@/lib/prisma";
import { computeTotals } from "@/lib/totals";

// Apply an online payment to an invoice using PROMPT 6 semantics: a partial
// payment (a deposit) keeps the invoice at "Acompte payé"; only reaching the
// total marks it "Payée". Clamps to the total so it can't overshoot.
export async function applyOnlinePayment(invoiceId: string, amountReceived: number): Promise<void> {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { lineItems: true },
  });
  if (!inv) return;

  const total = computeTotals(inv.lineItems).ttc;
  const amountPaid = Math.min(total, inv.amountPaid + amountReceived);
  const fullyPaid = amountPaid >= total;

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      amountPaid,
      status: fullyPaid ? "PAID" : inv.status,
      paidAt: fullyPaid ? new Date() : inv.paidAt,
    },
  });

  // Balance invoice fully paid → mark its parent (deposit) invoice paid too.
  if (fullyPaid && inv.parentInvoiceId) {
    const parent = await prisma.invoice.findUnique({
      where: { id: inv.parentInvoiceId },
      include: { lineItems: true },
    });
    if (parent) {
      await prisma.invoice.update({
        where: { id: parent.id },
        data: { amountPaid: computeTotals(parent.lineItems).ttc, status: "PAID", paidAt: new Date() },
      });
    }
  }
}
