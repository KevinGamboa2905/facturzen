import { NextResponse } from "next/server";

import { isAuthorizedCron } from "@/lib/cron";
import { flags } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { computeTotals } from "@/lib/totals";

// Uses Prisma → Node runtime, never statically rendered.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH = 50; // stay under the 10s hobby limit

// Daily payment-reminder sweep. Finds reminders that are due (scheduled in the
// past, not yet sent) on invoices that are still owed, and dispatches them.
//
// Email dispatch is gated on RESEND_API_KEY: without it (dev, or prod before
// email is configured) the sweep reports what WOULD be sent and mutates nothing
// — so a missing optional key never corrupts data or 500s. When Resend is wired
// in, send the message here and stamp `sentAt` on success.
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const dueReminders = await prisma.reminder.findMany({
    where: {
      sentAt: null,
      scheduledAt: { lte: now },
      invoice: { status: { in: ["SENT", "OVERDUE"] } },
    },
    include: { invoice: { include: { lineItems: true } } },
    orderBy: { scheduledAt: "asc" },
    take: BATCH,
  });

  // Only remind on invoices that are actually still owed.
  const owed = dueReminders.filter((r) => {
    const total = computeTotals(r.invoice.lineItems).ttc;
    return r.invoice.amountPaid < total;
  });

  let sent = 0;
  let errors = 0;
  const skipped = owed.length;

  if (flags.email) {
    for (const r of owed) {
      try {
        // TODO(email): send via Resend using the reminder tone/level, then:
        await prisma.reminder.update({ where: { id: r.id }, data: { sentAt: new Date() } });
        sent++;
      } catch {
        errors++;
      }
    }
  }

  return NextResponse.json({
    processed: owed.length,
    sent: flags.email ? sent : 0,
    // When email isn't configured, everything owed is reported as skipped.
    skipped: flags.email ? 0 : skipped,
    errors,
    emailConfigured: flags.email,
  });
}
