import { ensureDemoWorkspace, getDemoData } from "@/lib/demo/session";
import { invoiceTotalTtc } from "@/lib/app/dashboard";
import { formatAmount } from "@/lib/money";
import { NewClientButton } from "@/components/app/new-client-button";

export const dynamic = "force-dynamic";

export default async function DemoClientsPage() {
  const user = await ensureDemoWorkspace();
  const data = user ? await getDemoData(user.id) : null;
  if (!data) return null;

  const totalByClient = new Map<string, number>();
  for (const inv of data.invoices) {
    if (inv.currency !== "CHF" || !inv.clientId) continue;
    totalByClient.set(inv.clientId, (totalByClient.get(inv.clientId) ?? 0) + invoiceTotalTtc(inv));
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <NewClientButton />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.clients.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-5">
            <p className="font-medium">{c.name}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {c.city} {c.zip ? `· ${c.zip}` : ""}
            </p>
            {c.email && <p className="mt-2 truncate text-xs text-muted-foreground">{c.email}</p>}
            <div className="mt-4 border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">Total facturé</p>
              <p className="text-lg font-semibold tabular-nums">
                {formatAmount(totalByClient.get(c.id) ?? 0)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
