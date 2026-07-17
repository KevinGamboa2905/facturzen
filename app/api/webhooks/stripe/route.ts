import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";

import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { applyOnlinePayment } from "@/lib/app/payments";
import { recordEvent } from "@/lib/app/events";
import { dispatchInvoicePaid } from "@/lib/email/dispatch";
import { normalizePlan } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Handles both the platform (subscriptions) and connected-account (invoice
// payments via destination charges) events on one endpoint. Verifies signatures;
// no-op cleanly when Stripe isn't configured.
export async function POST(request: Request) {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "stripe not configured" }, { status: 400 });
  }

  const signature = (await headers()).get("stripe-signature") ?? "";
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const kind = s.metadata?.kind;

      if (kind === "subscription") {
        const userId = s.metadata?.userId ?? s.client_reference_id ?? undefined;
        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              plan: normalizePlan(s.metadata?.plan),
              trialEndsAt: null, // now paid
              stripeCustomerId: typeof s.customer === "string" ? s.customer : undefined,
              stripeSubscriptionId: typeof s.subscription === "string" ? s.subscription : undefined,
            },
          });
        }
      } else if (kind === "invoice-payment") {
        const invoiceId = s.metadata?.invoiceId ?? s.client_reference_id ?? undefined;
        if (invoiceId) {
          // Idempotent: skip if this exact Stripe event was already applied
          // (replays / retries must not double-count — PROMPT 17 §3).
          const already = await prisma.documentEvent.findFirst({
            where: { invoiceId, payload: { path: ["stripeEvent"], equals: event.id } },
            select: { id: true },
          });
          if (!already) {
            await applyOnlinePayment(invoiceId, s.amount_total ?? 0);
            const inv = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { status: true } });
            const fullyPaid = inv?.status === "PAID";
            // Timeline: "payée en ligne via Stripe" (surfaces to the user).
            await recordEvent({ invoiceId }, fullyPaid ? "PAID" : "DEPOSIT_PAID", {
              online: true,
              via: "stripe",
              stripeEvent: event.id,
            });
            // Receipt email to the client once the invoice is fully settled.
            if (fullyPaid) await dispatchInvoicePaid(invoiceId);
          }
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const user = await prisma.user.findFirst({
        where: { stripeSubscriptionId: sub.id },
        select: { id: true },
      });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { plan: "FREE", stripeSubscriptionId: null },
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      if (sub.status === "canceled" || sub.status === "unpaid") {
        const user = await prisma.user.findFirst({
          where: { stripeSubscriptionId: sub.id },
          select: { id: true },
        });
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: { plan: "FREE", stripeSubscriptionId: null },
          });
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
