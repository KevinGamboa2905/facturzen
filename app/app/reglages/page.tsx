import { prisma } from "@/lib/prisma";
import { getWorkspace } from "@/lib/workspace";
import { isStorageConfigured } from "@/lib/storage";
import { stripeConfigured } from "@/lib/stripe";
import { buildSettingsData } from "@/lib/app/settings";
import { effectivePlan, trialDaysLeft, trialExpired, limit } from "@/lib/plans";
import { sentInvoicesThisMonth } from "@/lib/app/usage";
import { stripeConnectStatus } from "@/app/actions/payments";
import { SettingsView } from "@/components/app/settings-view";

export const dynamic = "force-dynamic";

const TAB_IDS = ["profil", "facturation", "relances", "paiements", "abonnement"] as const;

export default async function AppSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const ws = await getWorkspace();
  if (!ws) return null;
  const { tab } = await searchParams;

  const [user, settings, sentThisMonth, connect] = await Promise.all([
    prisma.user.findUnique({ where: { id: ws.userId } }),
    prisma.settings.findUnique({ where: { userId: ws.userId } }),
    sentInvoicesThisMonth(ws.userId),
    stripeConnectStatus(),
  ]);
  if (!user) return null;

  const initial = buildSettingsData(user, settings, {
    effectivePlan: effectivePlan(user),
    trialDaysLeft: trialDaysLeft(user),
    trialExpired: trialExpired(user),
    sentThisMonth,
    invoiceLimit: limit(user, "invoicesPerMonth"),
    stripeConfigured,
    stripeConnected: connect.connected,
    stripeChargesEnabled: connect.chargesEnabled,
    stripeNeedsAttention: connect.needsAttention,
  });

  const initialTab = TAB_IDS.includes((tab ?? "") as (typeof TAB_IDS)[number])
    ? (tab as (typeof TAB_IDS)[number])
    : "profil";

  return (
    <SettingsView
      initial={initial}
      uploadsEnabled={isStorageConfigured()}
      initialTab={initialTab}
    />
  );
}
