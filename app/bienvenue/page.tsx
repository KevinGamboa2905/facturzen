import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingWizard, type OnboardingInitial } from "@/components/app/onboarding-wizard";
import { DEFAULT_PAYMENT_TERMS, DEFAULT_VAT_RATE } from "@/lib/profile-options";

export const dynamic = "force-dynamic";

// The real 3-step onboarding (prompt 2 §2a). Resume point is derived from what's
// already saved, so closing the tab and returning picks up where the user left.
export default async function BienvenuePage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/connexion");
  // Already onboarded → never show the wizard again.
  if (user.onboardingCompletedAt) redirect("/app");

  // Resume where the user left off: plan chosen → finish; activity saved →
  // billing; otherwise the start.
  const initialStep: 1 | 2 | 3 | 4 = user.planSelectedAt ? 4 : user.activityType ? 2 : 1;

  const initial: OnboardingInitial = {
    companyName: user.companyName ?? user.name ?? "",
    activityType: user.activityType ?? "",
    canton: user.canton ?? "",
    country: user.country ?? "CH",
    defaultCurrency: user.defaultCurrency ?? "CHF",
    vatEnabled: user.vatEnabled ?? false,
    vatNumber: user.vatNumber ?? "",
    defaultVatRate: user.defaultVatRate ?? DEFAULT_VAT_RATE,
    paymentTermsDays: user.paymentTermsDays ?? DEFAULT_PAYMENT_TERMS,
    plan: user.plan ?? "FREE",
  };

  return <OnboardingWizard initial={initial} initialStep={initialStep} />;
}
