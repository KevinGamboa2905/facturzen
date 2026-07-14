import { getWorkspace, getWorkspaceData } from "@/lib/workspace";
import { InvoicesView } from "@/components/app/invoices-view";

export const dynamic = "force-dynamic";

export default async function AppInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; q?: string; sort?: string }>;
}) {
  const { statut = "all", q = "", sort = "date" } = await searchParams;
  const ws = await getWorkspace();
  if (!ws) return null;
  const data = await getWorkspaceData(ws.userId);
  if (!data) return null;

  return <InvoicesView basePath="/app" invoices={data.invoices} statut={statut} q={q} sort={sort} />;
}
