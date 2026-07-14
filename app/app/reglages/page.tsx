import { prisma } from "@/lib/prisma";
import { getWorkspace } from "@/lib/workspace";
import { isStorageConfigured } from "@/lib/storage";
import { buildSettingsData } from "@/lib/app/settings";
import { SettingsView } from "@/components/app/settings-view";

export const dynamic = "force-dynamic";

export default async function AppSettingsPage() {
  const ws = await getWorkspace();
  if (!ws) return null;
  const [user, settings] = await Promise.all([
    prisma.user.findUnique({ where: { id: ws.userId } }),
    prisma.settings.findUnique({ where: { userId: ws.userId } }),
  ]);
  if (!user) return null;

  return (
    <SettingsView initial={buildSettingsData(user, settings)} uploadsEnabled={isStorageConfigured()} />
  );
}
