import "server-only";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureDemoWorkspace } from "@/lib/demo/session";

export type Workspace = { userId: string; isDemo: boolean };

// Resolve the active workspace for both the real app (authed user) and the
// public demo (cookie-bound sandbox user). One abstraction so pages, queries
// and server actions work identically in /app and /demo.
export async function getWorkspace(): Promise<Workspace | null> {
  const session = await auth();
  if (session?.user?.id) {
    return { userId: session.user.id, isDemo: Boolean(session.user.isDemo) };
  }
  const demo = await ensureDemoWorkspace();
  if (demo) return { userId: demo.id, isDemo: true };
  return null;
}

// Full workspace dataset (user + clients + invoices + quotes with relations),
// keyed only by userId — identical for the real app and the demo sandbox. The
// single source both /app and /demo pages read, so their list/detail/dashboard
// views can be one shared component fed the same shape.
export async function getWorkspaceData(userId: string) {
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

export type WorkspaceData = NonNullable<Awaited<ReturnType<typeof getWorkspaceData>>>;

export async function getServices(userId: string, includeArchived = false) {
  return prisma.service.findMany({
    where: { userId, ...(includeArchived ? {} : { isArchived: false }) },
    orderBy: [{ isFavorite: "desc" }, { timesUsed: "desc" }, { position: "asc" }],
  });
}

export async function getPackages(userId: string) {
  return prisma.servicePackage.findMany({
    where: { userId },
    include: { items: { include: { service: true }, orderBy: { position: "asc" } } },
    orderBy: { position: "asc" },
  });
}
