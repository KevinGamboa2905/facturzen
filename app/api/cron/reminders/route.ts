import { NextResponse } from "next/server";

import { isAuthorizedCron } from "@/lib/cron";
import { flags } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { computeTotals } from "@/lib/totals";
import { formatAmount } from "@/lib/money";
import { recordEvent, reminderEmailCopy, TONE_BY_LEVEL } from "@/lib/app/events";
import { dispatchReminder, dispatchDueSoon } from "@/lib/email/dispatch";

// Uses Prisma + PDF → Node runtime, never statically rendered.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ≤ 20 emails per run (each generates a PDF) to stay under the serverless limit;
// the rest are picked up on the next daily run (§2).
const BATCH = 20;

function fill(text: string, v: { client: string; numero: string; montant: string; jours: number }): string {
  return text
    .replace(/\{client\}/g, v.client)
    .replace(/\{numero\}/g, v.numero)
    .replace(/\{montant\}/g, v.montant)
    .replace(/\{jours\}/g, String(v.jours));
}

// Daily sweep: dispatch due payment reminders, then gentle J−3 pre-due reminders.
// Demo workspaces are excluded (no real email ever leaves a demo — belt and
// braces on top of sendEmail's central guard).
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let sent = 0;
  let errors = 0;

  // --- Due reminders (scheduled in the past, not yet sent, still owed) --------
  const dueReminders = await prisma.reminder.findMany({
    where: {
      sentAt: null,
      scheduledAt: { lte: now },
      invoice: { status: { in: ["SENT", "OVERDUE"] }, user: { isDemo: false } },
    },
    include: {
      invoice: { include: { lineItems: true, client: true, user: { select: { companyName: true } } } },
    },
    orderBy: { scheduledAt: "asc" },
    take: BATCH,
  });

  for (const r of dueReminders) {
    const inv = r.invoice;
    const total = computeTotals(inv.lineItems).ttc;
    if (inv.amountPaid >= total) {
      // Already paid → drop the scheduled reminder, don't chase.
      await prisma.reminder.delete({ where: { id: r.id } });
      continue;
    }
    try {
      const settings = await prisma.settings.findUnique({ where: { userId: inv.userId } });
      const currency = inv.currency as "CHF" | "EUR";
      const amount = formatAmount(total, currency);
      const daysOverdue = Math.max(0, Math.floor((now.getTime() - inv.dueDate.getTime()) / 86_400_000));
      const defaultCopy = reminderEmailCopy({
        clientName: inv.client?.name ?? "Client",
        number: inv.number,
        amount,
        level: r.level,
        company: inv.user.companyName ?? "FacturZen",
      });
      const custom =
        r.level === 1 ? settings?.reminderText1 : r.level === 2 ? settings?.reminderText2 : settings?.reminderText3;
      const bodyText =
        custom && custom.trim()
          ? fill(custom, { client: inv.client?.name ?? "Client", numero: inv.number, montant: amount, jours: daysOverdue })
          : defaultCopy.body;

      const res = await dispatchReminder(inv.id, r.level, bodyText);
      if (!res.ok) {
        // Real send failed → leave it unsent so the next run retries.
        errors++;
        continue;
      }
      await prisma.reminder.update({ where: { id: r.id }, data: { sentAt: new Date() } });
      await recordEvent({ invoiceId: inv.id }, "REMINDER_SENT", {
        level: r.level,
        tone: TONE_BY_LEVEL[r.level],
        subject: defaultCopy.subject,
        body: bodyText,
        simulated: res.simulated,
      });
      sent++;
    } catch {
      errors++;
    }
  }

  // --- Gentle J−3 pre-due reminders (once per invoice, deduped via DUE_SOON) ---
  const remaining = Math.max(0, BATCH - dueReminders.length);
  let dueSoon = 0;
  if (remaining > 0) {
    const soonCutoff = new Date(now.getTime() + 3 * 86_400_000);
    const soonInvoices = await prisma.invoice.findMany({
      where: {
        status: "SENT",
        dueDate: { gt: now, lte: soonCutoff },
        user: { isDemo: false },
        events: { none: { type: "DUE_SOON" } },
      },
      include: { lineItems: true },
      take: remaining,
    });
    for (const inv of soonInvoices) {
      if (inv.amountPaid >= computeTotals(inv.lineItems).ttc) continue;
      try {
        const res = await dispatchDueSoon(inv.id);
        if (!res.ok) {
          errors++;
          continue;
        }
        await recordEvent({ invoiceId: inv.id }, "DUE_SOON", { simulated: res.simulated });
        dueSoon++;
      } catch {
        errors++;
      }
    }
  }

  return NextResponse.json({ processed: dueReminders.length, sent, dueSoon, errors, emailConfigured: flags.email });
}
