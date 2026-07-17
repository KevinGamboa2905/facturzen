"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getWorkspace } from "@/lib/workspace";
import { addStarterServices } from "@/app/actions/services";
import { dispatchWelcome } from "@/lib/email/dispatch";
import { DEFAULT_PAYMENT_TERMS, DEFAULT_VAT_RATE } from "@/lib/profile-options";
import { normalizePlan } from "@/lib/plans";

type Ok = { ok: boolean };

const TRIAL_DAYS = 14;

// Existing users (onboarded before the plan step) see the dashboard nudge once.
export async function dismissPlanNudge(): Promise<Ok> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false };
  await prisma.user.update({
    where: { id: ws.userId },
    data: { planBannerSeenAt: new Date() },
  });
  revalidatePath("/app");
  return { ok: true };
}

// Step 3 — plan choice. No card is taken: FREE starts as-is, INDEP/STUDIO start
// a 14-day internal trial. Payment is configured later in Réglages → Abonnement.
export async function saveOnboardingPlan(planId: string): Promise<Ok> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false };
  const id = normalizePlan(planId);
  const now = new Date();
  await prisma.user.update({
    where: { id: ws.userId },
    data: {
      plan: id,
      planSelectedAt: now,
      billingCycleAnchor: now,
      trialEndsAt: id === "FREE" ? null : new Date(now.getTime() + TRIAL_DAYS * 86_400_000),
    },
  });
  return { ok: true };
}

// Step 1 — who's invoicing. Saved on "continuer" so closing the tab resumes here.
export async function saveOnboardingProfile(input: {
  companyName: string;
  activityType: string;
  canton: string;
  country: string;
}): Promise<Ok> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false };
  await prisma.user.update({
    where: { id: ws.userId },
    data: {
      companyName: input.companyName?.trim() || null,
      activityType: input.activityType || null,
      canton: input.canton || null,
      country: input.country || "CH",
    },
  });
  return { ok: true };
}

// Step 2 — billing defaults. Everything has a default, so it can be skipped.
export async function saveOnboardingBilling(input: {
  defaultCurrency: string;
  vatEnabled: boolean;
  vatNumber: string;
  defaultVatRate: number;
  paymentTermsDays: number;
}): Promise<Ok> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false };
  await prisma.user.update({
    where: { id: ws.userId },
    data: {
      defaultCurrency: input.defaultCurrency === "EUR" ? "EUR" : "CHF",
      vatEnabled: input.vatEnabled,
      vatNumber: input.vatEnabled ? input.vatNumber?.trim() || null : null,
      defaultVatRate: Number.isFinite(input.defaultVatRate) ? input.defaultVatRate : DEFAULT_VAT_RATE,
      paymentTermsDays: Number.isFinite(input.paymentTermsDays)
        ? input.paymentTermsDays
        : DEFAULT_PAYMENT_TERMS,
    },
  });
  return { ok: true };
}

// Step 3 — finish. Stamp onboardingCompletedAt and seed the starter pack for the
// chosen activity (once — only if the catalogue is still empty).
export async function completeOnboarding(): Promise<Ok> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false };
  const user = await prisma.user.findUnique({
    where: { id: ws.userId },
    select: { onboardingCompletedAt: true, activityType: true, welcomeEmailSentAt: true },
  });
  if (!user) return { ok: false };

  if (!user.onboardingCompletedAt) {
    await prisma.user.update({
      where: { id: ws.userId },
      data: { onboardingCompletedAt: new Date() },
    });
    const count = await prisma.service.count({ where: { userId: ws.userId } });
    if (count === 0) await addStarterServices(user.activityType ?? undefined);
  }

  // Welcome email — exactly once, at the end of onboarding (not on raw sign-in).
  if (!user.welcomeEmailSentAt) {
    await prisma.user.update({
      where: { id: ws.userId },
      data: { welcomeEmailSentAt: new Date() },
    });
    await dispatchWelcome(ws.userId);
  }

  revalidatePath("/app");
  return { ok: true };
}
