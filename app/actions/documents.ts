"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getWorkspace } from "@/lib/workspace";
import { computeTotals } from "@/lib/totals";

export type DocKind = "FAC" | "DEV";

export type SaveLineItem = {
  label: string;
  description?: string | null;
  quantity: number;
  unitPrice: number; // centimes
  vatRate: number;
};

export type SavePayload = {
  clientId: string | null;
  depositPercent: number | null;
  lineItems: SaveLineItem[];
};

// Sequential per-year numbering (§4). Zero-padded so string ordering is correct.
async function nextNumber(userId: string, kind: DocKind): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${kind}-${year}-`;
  const last =
    kind === "FAC"
      ? await prisma.invoice.findFirst({
          where: { userId, number: { startsWith: prefix } },
          orderBy: { number: "desc" },
          select: { number: true },
        })
      : await prisma.quote.findFirst({
          where: { userId, number: { startsWith: prefix } },
          orderBy: { number: "desc" },
          select: { number: true },
        });

  let seq = 1;
  if (last) {
    const parsed = parseInt(last.number.slice(prefix.length), 10);
    if (Number.isFinite(parsed)) seq = parsed + 1;
  }
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

export async function createDraftInvoice(): Promise<{ ok: boolean; id?: string }> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false };

  const user = await prisma.user.findUnique({
    where: { id: ws.userId },
    select: { paymentTermsDays: true, defaultCurrency: true },
  });
  const now = new Date();
  const due = new Date(now.getTime() + (user?.paymentTermsDays ?? 30) * 86_400_000);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const invoice = await prisma.invoice.create({
        data: {
          userId: ws.userId,
          number: await nextNumber(ws.userId, "FAC"),
          status: "DRAFT",
          issueDate: now,
          dueDate: due,
          currency: user?.defaultCurrency ?? "CHF",
        },
      });
      return { ok: true, id: invoice.id };
    } catch {
      // number collision — retry with the next sequence
    }
  }
  return { ok: false };
}

export async function createDraftQuote(): Promise<{ ok: boolean; id?: string }> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false };

  const user = await prisma.user.findUnique({
    where: { id: ws.userId },
    select: { defaultDepositPercent: true },
  });
  const now = new Date();
  const validUntil = new Date(now.getTime() + 30 * 86_400_000);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const quote = await prisma.quote.create({
        data: {
          userId: ws.userId,
          number: await nextNumber(ws.userId, "DEV"),
          status: "DRAFT",
          issueDate: now,
          validUntil,
          depositPercent: user?.defaultDepositPercent ?? null,
        },
      });
      return { ok: true, id: quote.id };
    } catch {
      // retry
    }
  }
  return { ok: false };
}

// Autosave: replace the document's line items and header fields.
export async function saveDocument(
  kind: DocKind,
  id: string,
  payload: SavePayload,
): Promise<{ ok: boolean; savedAt?: number; error?: string }> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false, error: "Session introuvable." };

  const owner =
    kind === "FAC"
      ? await prisma.invoice.findUnique({ where: { id }, select: { userId: true } })
      : await prisma.quote.findUnique({ where: { id }, select: { userId: true } });
  if (!owner || owner.userId !== ws.userId) return { ok: false, error: "Introuvable." };

  const fk = kind === "FAC" ? { invoiceId: id } : { quoteId: id };
  const items = payload.lineItems
    .filter((li) => li.label.trim() || li.unitPrice)
    .map((li, i) => ({
      ...fk,
      label: li.label.trim() || "Prestation",
      description: li.description?.trim() || null,
      quantity: li.quantity || 1,
      unitPrice: li.unitPrice,
      vatRate: li.vatRate,
      position: i,
    }));

  await prisma.lineItem.deleteMany({ where: fk });
  if (items.length) await prisma.lineItem.createMany({ data: items });

  if (kind === "FAC") {
    await prisma.invoice.update({
      where: { id },
      data: { clientId: payload.clientId, depositPercent: payload.depositPercent },
    });
  } else {
    await prisma.quote.update({
      where: { id },
      data: { clientId: payload.clientId, depositPercent: payload.depositPercent },
    });
  }

  return { ok: true, savedAt: Date.now() };
}

function revalidateLists() {
  for (const base of ["/demo", "/app"]) {
    revalidatePath(base);
    revalidatePath(`${base}/factures`);
    revalidatePath(`${base}/devis`);
  }
}

// Simulated in demo (no real email), real Resend send later. Arms the document.
export async function sendDocument(kind: DocKind, id: string): Promise<{ ok: boolean }> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false };

  if (kind === "FAC") {
    const inv = await prisma.invoice.findUnique({ where: { id }, select: { userId: true } });
    if (!inv || inv.userId !== ws.userId) return { ok: false };
    await prisma.invoice.update({ where: { id }, data: { status: "SENT" } });
  } else {
    const q = await prisma.quote.findUnique({ where: { id }, select: { userId: true } });
    if (!q || q.userId !== ws.userId) return { ok: false };
    await prisma.quote.update({ where: { id }, data: { status: "SENT" } });
  }
  revalidateLists();
  return { ok: true };
}

function invoiceTtc(lineItems: { quantity: number; unitPrice: number; vatRate: number }[]): number {
  return computeTotals(lineItems).ttc;
}

// Record the deposit as collected — never marks the invoice fully "Payée".
export async function markDepositPaid(id: string): Promise<{ ok: boolean; deposit?: number; remaining?: number }> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false };
  const inv = await prisma.invoice.findUnique({ where: { id }, include: { lineItems: true } });
  if (!inv || inv.userId !== ws.userId) return { ok: false };

  const total = invoiceTtc(inv.lineItems);
  const deposit = inv.depositPercent ? Math.round((total * inv.depositPercent) / 100) : total;
  await prisma.invoice.update({ where: { id }, data: { amountPaid: deposit, paidAt: new Date() } });
  revalidateLists();
  return { ok: true, deposit, remaining: total - deposit };
}

// Full payment. If this is a balance invoice, the original (parent) invoice is
// marked fully paid too (§2) — both become "Payée".
export async function markFullyPaid(id: string): Promise<{ ok: boolean }> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false };
  const inv = await prisma.invoice.findUnique({ where: { id }, include: { lineItems: true } });
  if (!inv || inv.userId !== ws.userId) return { ok: false };

  const total = invoiceTtc(inv.lineItems);
  await prisma.invoice.update({ where: { id }, data: { amountPaid: total, status: "PAID", paidAt: new Date() } });

  if (inv.parentInvoiceId) {
    const parent = await prisma.invoice.findUnique({ where: { id: inv.parentInvoiceId }, include: { lineItems: true } });
    if (parent && parent.userId === ws.userId) {
      await prisma.invoice.update({
        where: { id: parent.id },
        data: { amountPaid: invoiceTtc(parent.lineItems), status: "PAID", paidAt: new Date() },
      });
    }
  }
  revalidateLists();
  return { ok: true };
}

// The star action (§3 prompt 3): accepted quote → new invoice, copying the lines.
export async function convertQuoteToInvoice(quoteId: string): Promise<{ ok: boolean; id?: string }> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false };

  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { lineItems: { orderBy: { position: "asc" } } } });
  if (!quote || quote.userId !== ws.userId) return { ok: false };
  // No double conversion — return the existing invoice.
  if (quote.convertedInvoiceId) return { ok: true, id: quote.convertedInvoiceId };

  const user = await prisma.user.findUnique({
    where: { id: ws.userId },
    select: { paymentTermsDays: true, defaultCurrency: true },
  });
  const now = new Date();
  const due = new Date(now.getTime() + (user?.paymentTermsDays ?? 30) * 86_400_000);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const invoice = await prisma.invoice.create({
        data: {
          userId: ws.userId,
          clientId: quote.clientId,
          quoteId: quote.id,
          number: await nextNumber(ws.userId, "FAC"),
          status: "DRAFT",
          issueDate: now,
          dueDate: due,
          currency: user?.defaultCurrency ?? "CHF",
          lineItems: {
            create: quote.lineItems.map((li, i) => ({
              label: li.label,
              description: li.description,
              quantity: li.quantity,
              unitPrice: li.unitPrice,
              vatRate: li.vatRate,
              position: i,
            })),
          },
        },
      });
      revalidateLists();
      return { ok: true, id: invoice.id };
    } catch {
      // number collision — retry
    }
  }
  return { ok: false };
}

// Balance invoice (§2): total − acompte, with an "Acompte reçu" deduction line.
export async function createBalanceInvoice(depositInvoiceId: string): Promise<{ ok: boolean; id?: string }> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false };

  const dep = await prisma.invoice.findUnique({
    where: { id: depositInvoiceId },
    include: { lineItems: { orderBy: { position: "asc" } } },
  });
  if (!dep || dep.userId !== ws.userId || !dep.depositPercent) return { ok: false };

  const totals = computeTotals(
    dep.lineItems.map((li) => ({ quantity: li.quantity, unitPrice: li.unitPrice, vatRate: li.vatRate })),
    dep.depositPercent,
  );

  const user = await prisma.user.findUnique({
    where: { id: ws.userId },
    select: { paymentTermsDays: true },
  });
  const now = new Date();
  const due = new Date(now.getTime() + (user?.paymentTermsDays ?? 30) * 86_400_000);

  const lines = dep.lineItems.map((li, i) => ({
    label: li.label,
    description: li.description,
    quantity: li.quantity,
    unitPrice: li.unitPrice,
    vatRate: li.vatRate,
    position: i,
  }));
  // Deduction line (0% VAT) so TTC = mission − deposit exactly.
  lines.push({
    label: `Acompte reçu (facture ${dep.number})`,
    description: null,
    quantity: 1,
    unitPrice: -totals.deposit,
    vatRate: 0,
    position: lines.length,
  });

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const invoice = await prisma.invoice.create({
        data: {
          userId: ws.userId,
          clientId: dep.clientId,
          parentInvoiceId: dep.id,
          number: await nextNumber(ws.userId, "FAC"),
          status: "DRAFT",
          issueDate: now,
          dueDate: due,
          currency: dep.currency,
          lineItems: { create: lines },
        },
      });
      revalidateLists();
      return { ok: true, id: invoice.id };
    } catch {
      // retry
    }
  }
  return { ok: false };
}

// Catalogue learns from usage (§1): favourites bubble up.
export async function incrementServiceUsage(serviceId: string): Promise<void> {
  const ws = await getWorkspace();
  if (!ws) return;
  const service = await prisma.service.findUnique({ where: { id: serviceId }, select: { userId: true } });
  if (!service || service.userId !== ws.userId) return;
  await prisma.service.update({ where: { id: serviceId }, data: { timesUsed: { increment: 1 } } });
  revalidatePath("/demo/prestations");
  revalidatePath("/app/prestations");
}
