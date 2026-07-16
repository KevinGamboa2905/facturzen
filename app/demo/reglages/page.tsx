import { prisma } from "@/lib/prisma";
import { getWorkspace } from "@/lib/workspace";
import { isStorageConfigured } from "@/lib/storage";
import { stripeConfigured } from "@/lib/stripe";
import { buildSettingsData } from "@/lib/app/settings";
import { effectivePlan, trialDaysLeft, trialExpired, limit } from "@/lib/plans";
import { sentInvoicesThisMonth } from "@/lib/app/usage";
import { SettingsView } from "@/components/app/settings-view";

export const dynamic = "force-dynamic";

// Demo simulates a paid Indépendant account — no locks, no Stripe connect calls.
export default async function DemoSettingsPage() {
  const ws = await getWorkspace();
  if (!ws) return null;
  const [user, settings, sentThisMonth] = await Promise.all([
    prisma.user.findUnique({ where: { id: ws.userId } }),
    prisma.settings.findUnique({ where: { userId: ws.userId } }),
    sentInvoicesThisMonth(ws.userId),
  ]);
  if (!user) return null;

  const initial = buildSettingsData(user, settings, {
    effectivePlan: effectivePlan(user),
    trialDaysLeft: trialDaysLeft(user),
    trialExpired: trialExpired(user),
    sentThisMonth,
    invoiceLimit: limit(user, "invoicesPerMonth"),
    stripeConfigured,
    stripeConnected: false,
    stripeChargesEnabled: false,
    stripeNeedsAttention: false,
  });

  // Demo never sends real email → always show the simulated state.
  return (
    <SettingsView initial={initial} uploadsEnabled={isStorageConfigured()} emailConfigured={false} emailFrom="" />
  );
}
