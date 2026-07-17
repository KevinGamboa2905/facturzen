import { getWorkspace, getWorkspaceData } from "@/lib/workspace";
import { QuotesView } from "@/components/app/quotes-view";

export const dynamic = "force-dynamic";

export default async function AppQuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; q?: string; sort?: string }>;
}) {
  const { statut, q = "", sort = "date" } = await searchParams;
  const ws = await getWorkspace();
  if (!ws) return null;
  const data = await getWorkspaceData(ws.userId);
  if (!data) return null;

  return (
    <QuotesView basePath="/app" quotes={data.quotes} invoices={data.invoices} statut={statut} q={q} sort={sort} />
  );
}
