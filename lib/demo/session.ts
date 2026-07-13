import "server-only";
import { cookies } from "next/headers";
import type { User } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { computeTotals } from "@/lib/totals";
import {
  DEMO_CLIENTS,
  DEMO_INVOICES,
  DEMO_PACKAGES,
  DEMO_QUOTES,
  DEMO_SERVICES,
  DEMO_USER,
} from "@/lib/demo/seed-data";

export const DEMO_COOKIE = "fz_demo";
const DEMO_TTL_DAYS = 1;

const daysFromNow = (base: number, offset: number) => new Date(base + offset * 86_400_000);

// Copy the seed template into fresh isDemo records for one anonymous visitor.
async function createDemoWorkspace(token: string): Promise<User> {
  const now = Date.now();
  const off = (d: number) => daysFromNow(now, d);

  const user = await prisma.user.create({
    data: {
      ...DEMO_USER,
      // Email is @unique — give each sandbox its own (name stays "Léa Morand").
      email: `demo-${token}@demo.facturzen.local`,
      isDemo: true,
      demoToken: token,
      demoExpiresAt: off(DEMO_TTL_DAYS),
      onboardingCompletedAt: new Date(),
      demoTourSeenAt: null,
    },
  });

  const clientIdByKey: Record<string, string> = {};
  for (const c of DEMO_CLIENTS) {
    const created = await prisma.client.create({
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
    const created = await prisma.service.create({
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
    await prisma.servicePackage.create({
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
    const created = await prisma.quote.create({
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

    await prisma.invoice.create({
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
  }

  return user;
}

// De-dupe concurrent materializations (layout + page render in parallel and
// both call this) so a token is only ever seeded once per process.
const inflight = new Map<string, Promise<User>>();

// Resolve the current visitor's sandbox user, creating it on first visit.
// The cookie itself is set by middleware (Server Components can't set cookies).
export async function ensureDemoWorkspace(): Promise<User | null> {
  const token = (await cookies()).get(DEMO_COOKIE)?.value;
  if (!token) return null;

  const existing = await prisma.user.findUnique({ where: { demoToken: token } });
  if (existing) {
    if (existing.demoExpiresAt && existing.demoExpiresAt < new Date()) {
      await prisma.user.delete({ where: { id: existing.id } });
    } else {
      return existing;
    }
  }

  const pending = inflight.get(token);
  if (pending) return pending;

  const creation = createDemoWorkspace(token)
    .catch(async () => {
      // Another request won the race (unique demoToken) — reuse its result.
      const user = await prisma.user.findUnique({ where: { demoToken: token } });
      if (!user) throw new Error("demo workspace creation failed");
      return user;
    })
    .finally(() => inflight.delete(token));

  inflight.set(token, creation);
  return creation;
}

export type DemoWorkspace = NonNullable<Awaited<ReturnType<typeof getDemoData>>>;

// Full sandbox dataset for the dashboard and list pages.
export async function getDemoData(userId: string) {
  const [user, clients, invoices, quotes] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.client.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.invoice.findMany({
      where: { userId },
      include: {
        client: true,
        lineItems: true,
        reminders: { orderBy: { level: "asc" } },
        balances: { select: { id: true } },
      },
      orderBy: { issueDate: "desc" },
    }),
    prisma.quote.findMany({
      where: { userId },
      include: { client: true, lineItems: true },
      orderBy: { issueDate: "desc" },
    }),
  ]);

  if (!user) return null;
  return { user, clients, invoices, quotes };
}
