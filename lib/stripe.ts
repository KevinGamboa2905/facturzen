import "server-only";

import Stripe from "stripe";

import { env, flags, absoluteUrl } from "@/lib/env";
import type { PlanId } from "@/lib/plans";

// One Stripe client, or null when STRIPE_SECRET_KEY isn't set. Every caller must
// handle null (graceful degradation — no online payments, no dead buttons).
export const stripe: Stripe | null = flags.stripe
  ? new Stripe(env.STRIPE_SECRET_KEY as string)
  : null;

export const stripeConfigured = flags.stripe;

// Subscription price ids per plan (optional env — checkout degrades without them).
export function subscriptionPriceId(plan: PlanId): string | undefined {
  if (plan === "INDEP") return env.STRIPE_PRICE_INDEP;
  if (plan === "STUDIO") return env.STRIPE_PRICE_STUDIO;
  return undefined;
}

export const appUrl = (path = "") => absoluteUrl(path);
