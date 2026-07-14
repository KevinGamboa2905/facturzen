"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getWorkspace } from "@/lib/workspace";
import { computeTotals } from "@/lib/totals";
import { formatAmount } from "@/lib/money";
import { canSendInvoice, limit } from "@/lib/plans";
import { sentInvoicesThisMonth, monthLabel } from "@/lib/app/usage";
import {
  recordEvent,
  sendEmailCopy,
  reminderEmailCopy,
  TONE_BY_LEVEL,
} from "@/lib/app/events";

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
      await recordEvent({ invoiceId: invoice.id }, "CREATED");
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
      await recordEvent({ quoteId: quote.id }, "CREATED");
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
      ? await prisma.invoice.findUnique({ where: { id }, select: { userId: true, status: true } })
      : await prisma.quote.findUnique({ where: { id }, select: { userId: true, status: true } });
  if (!owner || owner.userId !== ws.userId) return { ok: false, error: "Introuvable." };
  // Immutability (§1): only a DRAFT can be edited — a sent document is locked to
  // preserve numbering integrity. Enforced server-side, not just in the UI.
  if (owner.status !== "DRAFT") return { ok: false, error: "Document déjà envoyé — non modifiable." };

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

export type SendResult =
  | { ok: true }
  | { ok: false }
  | { ok: false; reason: "LIMIT"; sent: number; limit: number; monthLabel: string };

// Arms the document. For invoices, the plan's monthly send quota is enforced here
// (only the send is blocked at the limit — the draft is untouched and survives).
export async function sendDocument(kind: DocKind, id: string): Promise<SendResult> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false };

  if (kind === "FAC") {
    const inv = await prisma.invoice.findUnique({
      where: { id },
      select: { userId: true, sentAt: true },
    });
    if (!inv || inv.userId !== ws.userId) return { ok: false };

    // Quota applies only the first time an invoice is sent.
    if (!inv.sentAt) {
      const user = await prisma.user.findUnique({
        where: { id: ws.userId },
        select: { plan: true, trialEndsAt: true, stripeSubscriptionId: true },
      });
      const sent = await sentInvoicesThisMonth(ws.userId);
      if (user && !canSendInvoice(user, sent)) {
        return {
          ok: false,
          reason: "LIMIT",
          sent,
          limit: limit(user, "invoicesPerMonth"),
          monthLabel: monthLabel(),
        };
      }
    }

    await prisma.invoice.update({
      where: { id },
      data: { status: "SENT", sentAt: inv.sentAt ?? new Date() },
    });
    await recordSendEvent("FAC", id);
  } else {
    const q = await prisma.quote.findUnique({ where: { id }, select: { userId: true } });
    if (!q || q.userId !== ws.userId) return { ok: false };
    await prisma.quote.update({ where: { id }, data: { status: "SENT" } });
    await recordSendEvent("DEV", id);
  }
  revalidateLists();
  return { ok: true };
}

// Record a SENT timeline event with the email copy as expedited.
async function recordSendEvent(kind: DocKind, id: string): Promise<void> {
  const doc =
    kind === "FAC"
      ? await prisma.invoice.findUnique({
          where: { id },
          include: { client: true, lineItems: true, user: { select: { companyName: true } } },
        })
      : await prisma.quote.findUnique({
          where: { id },
          include: { client: true, lineItems: true, user: { select: { companyName: true, defaultCurrency: true } } },
        });
  if (!doc) return;
  const currency = (kind === "FAC"
    ? (doc as { currency: string }).currency
    : (doc as { user: { defaultCurrency: string } }).user.defaultCurrency) as "CHF" | "EUR";
  const copy = sendEmailCopy({
    kind,
    clientName: doc.client?.name ?? "Client",
    number: doc.number,
    company: doc.user.companyName ?? "FacturZen",
    amount: formatAmount(computeTotals(doc.lineItems).ttc, currency),
  });
  await recordEvent(kind === "FAC" ? { invoiceId: id } : { quoteId: id }, "SENT", copy);
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
  await recordEvent({ invoiceId: id }, "DEPOSIT_PAID", { amount: deposit });
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
  await recordEvent({ invoiceId: id }, "PAID");

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
      await recordEvent({ invoiceId: invoice.id }, "CREATED");
      await recordEvent(
        { quoteId: quote.id },
        "CONVERTED",
        { invoiceId: invoice.id, invoiceNumber: invoice.number },
      );
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

// Turn off a scheduled (not-yet-sent) reminder from the timeline.
export async function disableReminder(reminderId: string): Promise<{ ok: boolean }> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false };
  const reminder = await prisma.reminder.findUnique({
    where: { id: reminderId },
    select: { invoice: { select: { userId: true } } },
  });
  if (!reminder || reminder.invoice.userId !== ws.userId) return { ok: false };
  await prisma.reminder.delete({ where: { id: reminderId } });
  revalidateLists();
  return { ok: true };
}

// Manual reminder from the detail view (§1/§2). Escalates by level based on how
// many reminders were already sent; records the email as expedited.
export async function remindNow(invoiceId: string): Promise<{ ok: boolean; level?: number }> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false };
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: true, lineItems: true, user: { select: { companyName: true } } },
  });
  if (!inv || inv.userId !== ws.userId) return { ok: false };

  const alreadySent = await prisma.documentEvent.count({
    where: { invoiceId, type: "REMINDER_SENT" },
  });
  const level = Math.min(3, alreadySent + 1);
  const copy = reminderEmailCopy({
    clientName: inv.client?.name ?? "Client",
    number: inv.number,
    amount: formatAmount(computeTotals(inv.lineItems).ttc, inv.currency as "CHF" | "EUR"),
    level,
    company: inv.user.companyName ?? "FacturZen",
  });
  await recordEvent({ invoiceId }, "REMINDER_SENT", {
    level,
    tone: TONE_BY_LEVEL[level],
    ...copy,
  });
  // Also stamp the matching Reminder row as sent, if one is scheduled.
  const scheduled = await prisma.reminder.findFirst({
    where: { invoiceId, level, sentAt: null },
  });
  if (scheduled) {
    await prisma.reminder.update({ where: { id: scheduled.id }, data: { sentAt: new Date() } });
  }
  revalidateLists();
  return { ok: true, level };
}

// "Refacturer" / duplicate: clone lines into a fresh DRAFT.
export async function duplicateDocument(
  kind: DocKind,
  id: string,
): Promise<{ ok: boolean; id?: string }> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false };

  const source =
    kind === "FAC"
      ? await prisma.invoice.findUnique({ where: { id }, include: { lineItems: { orderBy: { position: "asc" } } } })
      : await prisma.quote.findUnique({ where: { id }, include: { lineItems: { orderBy: { position: "asc" } } } });
  if (!source || source.userId !== ws.userId) return { ok: false };

  const user = await prisma.user.findUnique({
    where: { id: ws.userId },
    select: { paymentTermsDays: true, defaultCurrency: true },
  });
  const now = new Date();
  const lines = source.lineItems.map((li, i) => ({
    label: li.label,
    description: li.description,
    quantity: li.quantity,
    unitPrice: li.unitPrice,
    vatRate: li.vatRate,
    position: i,
  }));

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (kind === "FAC") {
        const due = new Date(now.getTime() + (user?.paymentTermsDays ?? 30) * 86_400_000);
        const created = await prisma.invoice.create({
          data: {
            userId: ws.userId,
            clientId: source.clientId,
            number: await nextNumber(ws.userId, "FAC"),
            status: "DRAFT",
            issueDate: now,
            dueDate: due,
            currency: (source as { currency: string }).currency,
            lineItems: { create: lines },
          },
        });
        await recordEvent({ invoiceId: created.id }, "CREATED");
        revalidateLists();
        return { ok: true, id: created.id };
      }
      const created = await prisma.quote.create({
        data: {
          userId: ws.userId,
          clientId: source.clientId,
          number: await nextNumber(ws.userId, "DEV"),
          status: "DRAFT",
          issueDate: now,
          validUntil: new Date(now.getTime() + 30 * 86_400_000),
          lineItems: { create: lines },
        },
      });
      await recordEvent({ quoteId: created.id }, "CREATED");
      revalidateLists();
      return { ok: true, id: created.id };
    } catch {
      // number collision — retry
    }
  }
  return { ok: false };
}

// Cancel a sent document (§1) — with confirmation in the UI.
export async function cancelDocument(kind: DocKind, id: string): Promise<{ ok: boolean }> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false };
  if (kind === "FAC") {
    const inv = await prisma.invoice.findUnique({ where: { id }, select: { userId: true } });
    if (!inv || inv.userId !== ws.userId) return { ok: false };
    await prisma.invoice.update({ where: { id }, data: { status: "CANCELLED" } });
  } else {
    const q = await prisma.quote.findUnique({ where: { id }, select: { userId: true } });
    if (!q || q.userId !== ws.userId) return { ok: false };
    await prisma.quote.update({ where: { id }, data: { status: "DECLINED" } });
  }
  await recordEvent(kind === "FAC" ? { invoiceId: id } : { quoteId: id }, "CANCELLED");
  revalidateLists();
  return { ok: true };
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
