import { getWorkspace, getWorkspaceData } from "@/lib/workspace";
import { buildInvoiceRows } from "@/lib/app/invoice-list";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const money = (cents: number) => (cents / 100).toFixed(2);
const date = (d: Date) => new Intl.DateTimeFormat("fr-CH").format(d);
const cell = (s: string) => `"${(s ?? "").replace(/"/g, '""')}"`;

// CSV export of the current invoices view (same filter/sort). Excel-friendly:
// ";" separator + UTF-8 BOM (§7).
export async function GET(request: Request) {
  const ws = await getWorkspace();
  if (!ws) return new Response("Non autorisé", { status: 401 });
  const data = await getWorkspaceData(ws.userId);
  if (!data) return new Response("Introuvable", { status: 404 });

  const { searchParams } = new URL(request.url);
  const rows = buildInvoiceRows(data.invoices, {
    statut: searchParams.get("statut") ?? "all",
    q: searchParams.get("q") ?? "",
    sort: searchParams.get("sort") ?? "date",
  });

  const header = ["Numéro", "Client", "Date", "Échéance", "HT", "TVA", "TTC", "Encaissé", "Statut", "Devise"];
  const BOM = "﻿";
  const body = rows.map(({ inv, totals, ds }) =>
    [
      cell(inv.number),
      cell(inv.client?.name ?? ""),
      cell(date(inv.issueDate)),
      cell(date(inv.dueDate)),
      money(totals.ht),
      money(totals.vat),
      money(totals.ttc),
      money(inv.amountPaid),
      cell(ds.label),
      cell(inv.currency),
    ].join(";"),
  );
  const csv = BOM + [header.map(cell).join(";"), ...body].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="factures-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
