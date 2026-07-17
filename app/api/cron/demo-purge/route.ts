import { NextResponse } from "next/server";

import { isAuthorizedCron } from "@/lib/cron";
import { prisma } from "@/lib/prisma";

// Uses Prisma → Node runtime, never statically rendered.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH = 100; // stay well under the 10s hobby limit

// Delete expired anonymous /demo sandboxes (demoExpiresAt in the past). Demo
// visits also purge lazily on access; this sweeps the ones nobody revisits.
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const expired = await prisma.user.findMany({
    where: { isDemo: true, demoExpiresAt: { not: null, lt: now } },
    select: { id: true },
    take: BATCH,
  });

  let processed = 0;
  let errors = 0;
  for (const u of expired) {
    try {
      await prisma.user.delete({ where: { id: u.id } }); // cascades to all data
      processed++;
    } catch {
      errors++;
    }
  }

  const remaining = await prisma.user.count({
    where: { isDemo: true, demoExpiresAt: { not: null, lt: now } },
  });

  return NextResponse.json({ processed, errors, remaining });
}
