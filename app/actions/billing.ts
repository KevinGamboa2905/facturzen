"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getWorkspace } from "@/lib/workspace";
import { stripe, subscriptionPriceId, appUrl } from "@/lib/stripe";
import { normalizePlan } from "@/lib/plans";

type Result = { ok: boolean; url?: string; error?: string };

const TRIAL_DAYS = 14;

function revalidate() {
  revalidatePath("/app");
  revalidatePath("/app/reglages");
}

// Internal plan change (no card). Used for trials and in the degraded (no Stripe)
// mode. Upgrade takes effect immediately; the UI messages downgrades clearly.
export async function changePlan(planId: string): Promise<Result> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false };
  const id = normalizePlan(planId);
  const now = new Date();
  const cur = await prisma.user.findUnique({
    where: { id: ws.userId },
    select: { stripeSubscriptionId: true, trialEndsAt: true },
  });

  const data: {
    plan: string;
    planSelectedAt: Date;
    trialEndsAt?: Date | null;
  } = { plan: id, planSelectedAt: now };

  if (id === "FREE") {
    data.trialEndsAt = null;
  } else if (!cur?.stripeSubscriptionId) {
    // Keep an ongoing trial, or start a fresh one.
    data.trialEndsAt =
      cur?.trialEndsAt && cur.trialEndsAt > now
        ? cur.trialEndsAt
        : new Date(now.getTime() + TRIAL_DAYS * 86_400_000);
  }

  await prisma.user.update({ where: { id: ws.userId }, data });
  revalidate();
  return { ok: true };
}

// Stripe subscription checkout (paid plan). Requires configured Stripe + price id.
export async function createSubscriptionCheckout(planId: string): Promise<Result> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false };
  if (!stripe) return { ok: false, error: "STRIPE_OFF" };

  const id = normalizePlan(planId);
  const price = subscriptionPriceId(id);
  if (!price) return { ok: false, error: "NO_PRICE" };

  const user = await prisma.user.findUnique({
    where: { id: ws.userId },
    select: { email: true, stripeCustomerId: true },
  });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    ...(user?.stripeCustomerId
      ? { customer: user.stripeCustomerId }
      : { customer_email: user?.email ?? undefined }),
    client_reference_id: ws.userId,
    metadata: { userId: ws.userId, plan: id, kind: "subscription" },
    success_url: appUrl("/app/reglages?tab=abonnement&sub=success"),
    cancel_url: appUrl("/app/reglages?tab=abonnement"),
  });

  return { ok: true, url: session.url ?? undefined };
}

// Stripe Billing Portal (manage/cancel the subscription).
export async function createBillingPortal(): Promise<Result> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false };
  if (!stripe) return { ok: false, error: "STRIPE_OFF" };

  const user = await prisma.user.findUnique({
    where: { id: ws.userId },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) return { ok: false, error: "NO_CUSTOMER" };

  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: appUrl("/app/reglages?tab=abonnement"),
  });
  return { ok: true, url: portal.url };
}
