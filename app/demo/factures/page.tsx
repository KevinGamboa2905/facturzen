import { getWorkspace, getWorkspaceData } from "@/lib/workspace";
import { InvoicesView } from "@/components/app/invoices-view";

export const dynamic = "force-dynamic";

export default async function DemoInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const { statut = "all" } = await searchParams;
  const ws = await getWorkspace();
  if (!ws) return null;
  const data = await getWorkspaceData(ws.userId);
  if (!data) return null;

  return <InvoicesView basePath="/demo" invoices={data.invoices} statut={statut} />;
}
