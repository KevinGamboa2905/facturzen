import { getWorkspace, getWorkspaceData } from "@/lib/workspace";
import { DashboardView } from "@/components/app/dashboard-view";

export const dynamic = "force-dynamic";

export default async function DemoDashboardPage() {
  const ws = await getWorkspace();
  if (!ws) return null;
  const data = await getWorkspaceData(ws.userId);
  if (!data) return null;

  return <DashboardView basePath="/demo" data={data} checklist={null} />;
}
