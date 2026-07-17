"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";
import { dispatchQuoteAccepted } from "@/lib/email/dispatch";

// Best-effort request fingerprint for the signature audit trail (§4).
async function signatureMeta(): Promise<{ ip: string; userAgent: string; at: string }> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim() || "unknown";
  return { ip, userAgent: h.get("user-agent") ?? "unknown", at: new Date().toISOString() };
}

// Public, token-scoped: the client accepts by typing their name (simple signature).
export async function acceptQuote(
  token: string,
  signatureName: string,
): Promise<{ ok: boolean; error?: string }> {
  const name = signatureName.trim();
  if (!name) return { ok: false, error: "Veuillez saisir votre nom pour signer." };

  const quote = await prisma.quote.findUnique({ where: { publicToken: token } });
  if (!quote) return { ok: false, error: "Devis introuvable." };
  if (quote.status === "ACCEPTED") return { ok: true };
  if (!["SENT", "DRAFT", "EXPIRED"].includes(quote.status)) {
    return { ok: false, error: "Ce devis ne peut plus être accepté." };
  }

  await prisma.quote.update({
    where: { id: quote.id },
    data: { status: "ACCEPTED", signedAt: new Date(), signatureName: name, signatureMeta: await signatureMeta() },
  });
  // Notify the freelancer their quote was accepted (simulated in demo / no key).
  await dispatchQuoteAccepted(quote.id);
  revalidatePath(`/d/${token}`);
  return { ok: true };
}

export async function declineQuote(token: string, reason?: string): Promise<{ ok: boolean }> {
  const quote = await prisma.quote.findUnique({ where: { publicToken: token } });
  if (!quote) return { ok: false };
  if (quote.status !== "ACCEPTED") {
    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: "DECLINED", declineReason: reason?.trim() || null },
    });
  }
  revalidatePath(`/d/${token}`);
  return { ok: true };
}
