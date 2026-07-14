import { notFound } from "next/navigation";

import { getWorkspace, getWorkspaceData } from "@/lib/workspace";
import { ClientDetailView } from "@/components/app/client-detail-view";

export const dynamic = "force-dynamic";

export default async function DemoClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ws = await getWorkspace();
  if (!ws) return null;
  const data = await getWorkspaceData(ws.userId);
  const client = data?.clients.find((c) => c.id === id);
  if (!data || !client) notFound();

  return (
    <ClientDetailView basePath="/demo" client={client} invoices={data.invoices} quotes={data.quotes} />
  );
}
