import { prisma } from "@/lib/prisma";
import { getWorkspace, getServices, getPackages } from "@/lib/workspace";
import { PrestationsView } from "@/components/app/prestations-view";

export const dynamic = "force-dynamic";

export default async function DemoPrestationsPage() {
  const ws = await getWorkspace();
  if (!ws) return null;

  const [services, packages, user] = await Promise.all([
    getServices(ws.userId),
    getPackages(ws.userId),
    prisma.user.findUnique({ where: { id: ws.userId }, select: { activityType: true } }),
  ]);

  return (
    <PrestationsView
      services={services}
      packages={packages}
      activityType={user?.activityType ?? null}
    />
  );
}
