import "server-only";
import { cookies } from "next/headers";
import type { User } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createDemoWorkspace } from "@/lib/demo/create";

export const DEMO_COOKIE = "fz_demo";
const DEMO_TTL_DAYS = 1;

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

  const creation = createDemoWorkspace(prisma, {
    token,
    // Email is @unique — give each sandbox its own (name stays "Léa Morand").
    email: `demo-${token}@demo.facturzen.local`,
    ttlDays: DEMO_TTL_DAYS,
  })
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
