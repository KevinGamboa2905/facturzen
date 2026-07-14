// Materialize a full demo workspace (Léa Morand / Studio Morand) from the seed
// template. Extracted from the request-scoped session helper so it can run in
// two very different contexts with the exact same result:
//   • the live app — one ephemeral sandbox per anonymous /demo visitor;
//   • `prisma db seed` — one canonical, persistent demo account.
// Deliberately NOT `server-only` and using relative imports only, so the seed
// script (run through tsx, outside Next) can import it without the `@/` alias
// or the React Server Components runtime.
import type { PrismaClient, User } from "@prisma/client";

import { computeTotals } from "../totals";
import { formatAmount } from "../money";
import { sendEmailCopy, reminderEmailCopy } from "../app/event-types";
import {
  DEMO_CLIENTS,
  DEMO_INVOICES,
  DEMO_PACKAGES,
  DEMO_QUOTES,
  DEMO_SERVICES,
  DEMO_USER,
} from "./seed-data";

const daysFromNow = (base: number, offset: number) => new Date(base + offset * 86_400_000);

export type CreateDemoOptions = {
  token: string;
  email: string;
  // Days until the sandbox self-purges; null = persistent (seeded demo account).
  ttlDays: number | null;
};

// Copy the seed template into fresh isDemo records for one workspace owner.
export async function createDemoWorkspace(
  db: PrismaClient,
  { token, email, ttlDays }: CreateDemoOptions,
): Promise<User> {
  const now = Date.now();
  const off = (d: number) => daysFromNow(now, d);

  const user = await db.user.create({
    data: {
      ...DEMO_USER,
      // Email is @unique — give each sandbox its own (name stays "Léa Morand").
      email,
      isDemo: true,
      demoToken: token,
      demoExpiresAt: ttlDays == null ? null : off(ttlDays),
      onboardingCompletedAt: new Date(),
      demoTourSeenAt: null,
    },
  });

  const clientIdByKey: Record<string, string> = {};
  for (const c of DEMO_CLIENTS) {
    const created = await db.client.create({
      data: {
        userId: user.id,
        name: c.name,
        email: c.email,
        address: c.address,
        city: c.city,
        zip: c.zip,
        country: c.country,
        notes: c.notes,
      },
    });
    clientIdByKey[c.key] = created.id;
  }

  // Service catalogue + one pack.
  const serviceIdByKey: Record<string, string> = {};
  for (let i = 0; i < DEMO_SERVICES.length; i++) {
    const s = DEMO_SERVICES[i];
    const created = await db.service.create({
      data: {
        userId: user.id,
        name: s.name,
        description: s.description,
        category: s.category,
        unitType: s.unitType,
        unitPrice: s.unitPrice,
        vatRate: DEMO_USER.defaultVatRate,
        currency: "CHF",
        isFavorite: s.isFavorite,
        timesUsed: s.timesUsed,
        position: i,
      },
    });
    serviceIdByKey[s.key] = created.id;
  }
  for (let i = 0; i < DEMO_PACKAGES.length; i++) {
    const p = DEMO_PACKAGES[i];
    await db.servicePackage.create({
      data: {
        userId: user.id,
        name: p.name,
        description: p.description,
        discountPercent: p.discountPercent,
        position: i,
        items: {
          create: p.items.map((it, j) => ({
            serviceId: serviceIdByKey[it.serviceKey],
            quantity: it.quantity,
            position: j,
          })),
        },
      },
    });
  }

  // Quotes first, so a converted invoice can reference its source quote.
  const quoteIdByKey: Record<string, string> = {};
  for (const q of DEMO_QUOTES) {
    const created = await db.quote.create({
      data: {
        userId: user.id,
        clientId: clientIdByKey[q.clientKey],
        number: q.number,
        status: q.status,
        issueDate: off(q.issueOffset),
        validUntil: off(q.validUntilOffset),
        depositPercent: q.depositPercent,
        signatureName: q.signatureName,
        signedAt: q.signedOffset != null ? off(q.signedOffset) : null,
        lineItems: {
          create: q.lineItems.map((li, i) => ({
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
    quoteIdByKey[q.key] = created.id;
  }

  for (const inv of DEMO_INVOICES) {
    const total = computeTotals(inv.lineItems).ttc;
    const deposit = inv.depositPercent ? Math.round((total * inv.depositPercent) / 100) : 0;
    // Paid invoices are fully collected; a deposit invoice has only the acompte in.
    const amountPaid =
      inv.status === "PAID" ? total : inv.depositPercent && inv.paidOffset != null ? deposit : 0;

    const created = await db.invoice.create({
      data: {
        userId: user.id,
        clientId: clientIdByKey[inv.clientKey],
        quoteId: inv.quoteKey ? quoteIdByKey[inv.quoteKey] : null,
        number: inv.number,
        status: inv.status,
        currency: inv.currency,
        depositPercent: inv.depositPercent ?? null,
        amountPaid,
        issueDate: off(inv.issueOffset),
        sentAt: off(inv.issueOffset), // all demo invoices are sent
        dueDate: off(inv.dueOffset),
        paidAt: inv.paidOffset != null ? off(inv.paidOffset) : null,
        lineItems: {
          create: inv.lineItems.map((li, i) => ({
            label: li.label,
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            vatRate: li.vatRate,
            position: i,
          })),
        },
        reminders: {
          create: inv.reminders.map((r) => ({
            level: r.level,
            tone: r.tone,
            scheduledAt: off(r.scheduledOffset),
            sentAt: r.sentOffset != null ? off(r.sentOffset) : null,
          })),
        },
      },
    });

    // Timeline events (§2): a complete story for sent/overdue/paid invoices, so
    // the demo overdue invoice shows created → sent → viewed → relance 1 → 2 and
    // a relance 3 still scheduled (dotted, via the not-yet-sent Reminder row).
    const amount = formatAmount(total, inv.currency);
    const events: {
      type: string;
      createdAt: Date;
      payload?: { subject: string; body: string; level?: number; tone?: string };
    }[] = [{ type: "CREATED", createdAt: off(inv.issueOffset) }];
    events.push({
      type: "SENT",
      createdAt: off(inv.issueOffset),
      payload: sendEmailCopy({
        kind: "FAC",
        clientName: DEMO_CLIENTS.find((c) => c.key === inv.clientKey)?.name ?? "Client",
        number: inv.number,
        company: DEMO_USER.companyName,
        amount,
      }),
    });
    if (inv.status === "OVERDUE") {
      events.push({ type: "VIEWED", createdAt: off(inv.issueOffset + 1) });
    }
    for (const r of inv.reminders) {
      if (r.sentOffset == null) continue;
      events.push({
        type: "REMINDER_SENT",
        createdAt: off(r.sentOffset),
        payload: {
          level: r.level,
          tone: r.tone,
          ...reminderEmailCopy({
            clientName: DEMO_CLIENTS.find((c) => c.key === inv.clientKey)?.name ?? "Client",
            number: inv.number,
            amount,
            level: r.level,
            company: DEMO_USER.companyName,
          }),
        },
      });
    }
    if (inv.status === "PAID" && inv.paidOffset != null) {
      events.push({ type: "PAID", createdAt: off(inv.paidOffset) });
    }
    await db.documentEvent.createMany({
      data: events.map((e) => ({ invoiceId: created.id, type: e.type, payload: e.payload, createdAt: e.createdAt })),
    });
  }

  return user;
}
