import { NextResponse } from "next/server";

import { isAuthorizedCron } from "@/lib/cron";

// Uses Prisma (once recurrence lands) → Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Daily generation of recurring invoices.
//
// The data model has no recurrence fields yet (no schedule/interval on Invoice),
// so there is nothing to generate — this endpoint is wired, secured and shaped
// correctly, returning an honest empty summary. When recurring invoices are
// added to the schema, iterate the due schedules here (batched, < 10s) and
// create the next invoice for each.
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    processed: 0,
    generated: 0,
    errors: 0,
    note: "Aucune récurrence configurée dans le modèle de données (fonctionnalité à venir).",
  });
}
