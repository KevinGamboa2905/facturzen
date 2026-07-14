import { getWorkspace, getWorkspaceData } from "@/lib/workspace";
import { buildClientRows } from "@/lib/app/clients";
import { ClientsView } from "@/components/app/clients-view";

export const dynamic = "force-dynamic";

export default async function DemoClientsPage() {
  const ws = await getWorkspace();
  if (!ws) return null;
  const data = await getWorkspaceData(ws.userId);
  if (!data) return null;

  return <ClientsView basePath="/demo" clients={buildClientRows(data)} />;
}
