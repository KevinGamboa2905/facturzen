import { prisma } from "@/lib/prisma";
import { getWorkspace, getWorkspaceData } from "@/lib/workspace";
import { computeChecklist } from "@/lib/app/checklist";
import { DashboardView } from "@/components/app/dashboard-view";

export const dynamic = "force-dynamic";

export default async function AppHomePage() {
  const ws = await getWorkspace();
  if (!ws) return null;

  const [data, settings] = await Promise.all([
    getWorkspaceData(ws.userId),
    prisma.settings.findUnique({ where: { userId: ws.userId } }),
  ]);
  if (!data) return null;

  const remindersCustomized = Boolean(
    settings && (settings.reminderText1 || settings.reminderText2 || settings.reminderText3),
  );
  const checklist = data.user.checklistDismissedAt
    ? null
    : computeChecklist("/app", data, remindersCustomized);

  return <DashboardView basePath="/app" data={data} checklist={checklist} />;
}
