"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getWorkspace } from "@/lib/workspace";
import { stripe, appUrl } from "@/lib/stripe";
import { computeTotals } from "@/lib/totals";
import { can } from "@/lib/plans";

type Result = { ok: boolean; url?: string; error?: string };

function revalidate() {
  revalidatePath("/app/reglages");
  revalidatePath("/app");
}

// Bank-transfer coordinates (single source with the company profile IBAN).
export async function updatePaymentSettings(input: {
  iban: string;
  accountHolder: string;
  showBankDetails: boolean;
}): Promise<Result> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false, error: "Session introuvable." };
  await prisma.user.update({
    where: { id: ws.userId },
    data: {
      iban: input.iban?.replace(/\s+/g, "") || null,
      accountHolder: input.accountHolder?.trim() || null,
      showBankDetails: input.showBankDetails,
    },
  });
  revalidate();
  return { ok: true };
}

// Start (or resume) Stripe Connect Express onboarding.
export async function connectStripe(): Promise<Result> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false };
  if (!stripe) return { ok: false, error: "STRIPE_OFF" };

  const user = await prisma.user.findUnique({
    where: { id: ws.userId },
    select: { stripeAccountId: true, email: true },
  });

  let accountId = user?.stripeAccountId ?? null;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: user?.email ?? undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    accountId = account.id;
    await prisma.user.update({ where: { id: ws.userId }, data: { stripeAccountId: accountId } });
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: appUrl("/app/reglages?tab=paiements&connect=refresh"),
    return_url: appUrl("/app/reglages?tab=paiements&connect=return"),
    type: "account_onboarding",
  });
  return { ok: true, url: link.url };
}

export type ConnectStatus = {
  connected: boolean;
  chargesEnabled: boolean;
  needsAttention: boolean;
};

// Live status of the connected account (used to render the badge + resume link).
export async function stripeConnectStatus(): Promise<ConnectStatus> {
  const off = { connected: false, chargesEnabled: false, needsAttention: false };
  const ws = await getWorkspace();
  if (!ws || !stripe) return off;
  const user = await prisma.user.findUnique({
    where: { id: ws.userId },
    select: { stripeAccountId: true },
  });
  if (!user?.stripeAccountId) return off;
  try {
    const acct = await stripe.accounts.retrieve(user.stripeAccountId);
    return {
      connected: true,
      chargesEnabled: Boolean(acct.charges_enabled),
      needsAttention: !acct.details_submitted || !acct.charges_enabled,
    };
  } catch {
    return off;
  }
}

export async function disconnectStripe(): Promise<Result> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false };
  await prisma.user.update({ where: { id: ws.userId }, data: { stripeAccountId: null } });
  revalidate();
  return { ok: true };
}

// Public: create a Checkout session to pay an invoice online (destination charge
// onto the owner's connected account). Called from /f/[token] — no session.
export async function createInvoiceCheckout(token: string): Promise<Result> {
  if (!stripe) return { ok: false, error: "STRIPE_OFF" };
  const inv = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: { lineItems: true, user: true },
  });
  if (!inv) return { ok: false, error: "Introuvable." };

  const owner = inv.user;
  if (!owner.stripeAccountId || !can(owner, "onlinePayment")) {
    return { ok: false, error: "Le paiement en ligne n'est pas disponible." };
  }

  const total = computeTotals(inv.lineItems).ttc;
  const outstanding = total - inv.amountPaid;
  if (outstanding <= 0) return { ok: false, error: "Déjà payée." };

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: inv.currency.toLowerCase(),
          unit_amount: outstanding, // centimes = smallest unit for CHF/EUR
          product_data: { name: `${inv.number} · ${owner.companyName ?? "Facty"}` },
        },
        quantity: 1,
      },
    ],
    payment_intent_data: { transfer_data: { destination: owner.stripeAccountId } },
    client_reference_id: inv.id,
    metadata: { invoiceId: inv.id, kind: "invoice-payment" },
    success_url: appUrl(`/f/${token}?paid=1`),
    cancel_url: appUrl(`/f/${token}`),
  });
  return { ok: true, url: session.url ?? undefined };
}
