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
