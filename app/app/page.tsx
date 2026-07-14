import { prisma } from "@/lib/prisma";
import { getWorkspace, getWorkspaceData } from "@/lib/workspace";
import { computeChecklist } from "@/lib/app/checklist";
import { limit } from "@/lib/plans";
import { sentInvoicesThisMonth, monthLabel } from "@/lib/app/usage";
import { DashboardView } from "@/components/app/dashboard-view";

export const dynamic = "force-dynamic";

export default async function AppHomePage() {
  const ws = await getWorkspace();
  if (!ws) return null;

  const [data, settings, sentThisMonth] = await Promise.all([
    getWorkspaceData(ws.userId),
    prisma.settings.findUnique({ where: { userId: ws.userId } }),
    sentInvoicesThisMonth(ws.userId),
  ]);
  if (!data) return null;

  const remindersCustomized = Boolean(
    settings && (settings.reminderText1 || settings.reminderText2 || settings.reminderText3),
  );
  const checklist = data.user.checklistDismissedAt
    ? null
    : computeChecklist("/app", data, remindersCustomized);

  const invoiceLimit = limit(data.user, "invoicesPerMonth");
  const planUsage = {
    // A capped monthly quota is exactly what defines the free tier — derive it.
    isFree: invoiceLimit !== Infinity,
    sentThisMonth,
    invoiceLimit,
    monthLabel: monthLabel(),
    // Onboarded before the plan step (never picked one) → nudge once.
    showNudge: data.user.planSelectedAt === null && data.user.planBannerSeenAt === null,
  };

  return <DashboardView basePath="/app" data={data} checklist={checklist} planUsage={planUsage} />;
}
