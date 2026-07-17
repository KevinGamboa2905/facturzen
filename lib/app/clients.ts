import type { WorkspaceData } from "@/lib/workspace";
import { invoiceTotalTtc } from "@/lib/app/dashboard";
import type { ClientRow } from "@/components/app/clients-view";

// Derive the clients-list rows (CHF total invoiced + doc count) from a workspace
// dataset. Shared by /app and /demo so both lists compute totals identically.
export function buildClientRows(data: WorkspaceData): ClientRow[] {
  const totalByClient = new Map<string, number>();
  const docsByClient = new Map<string, number>();

  for (const inv of data.invoices) {
    if (!inv.clientId) continue;
    docsByClient.set(inv.clientId, (docsByClient.get(inv.clientId) ?? 0) + 1);
    if (inv.currency !== "CHF") continue;
    totalByClient.set(inv.clientId, (totalByClient.get(inv.clientId) ?? 0) + invoiceTotalTtc(inv));
  }
  for (const q of data.quotes) {
    if (!q.clientId) continue;
    docsByClient.set(q.clientId, (docsByClient.get(q.clientId) ?? 0) + 1);
  }

  return data.clients.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    city: c.city,
    zip: c.zip,
    total: totalByClient.get(c.id) ?? 0,
    docCount: docsByClient.get(c.id) ?? 0,
  }));
}
