import { NextResponse } from "next/server";

import { isProduction } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  dispatchDocumentSent,
  dispatchReminder,
  dispatchInvoicePaid,
  dispatchQuoteAccepted,
  dispatchWelcome,
} from "@/lib/email/dispatch";

// Dev-only: seed a real invoice/quote and fire the REAL dispatchers so every
// email goes out with its actual PDF attachment (QR facture, receipt). 404 in prod.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (isProduction) return NextResponse.json({ error: "not found" }, { status: 404 });
  const to = new URL(request.url).searchParams.get("to");
  if (!to) return NextResponse.json({ error: "?to= required" }, { status: 400 });

  // Fresh non-demo workspace. Both the user (family A) and the client (family B)
  // use `to` so every email lands on the verified test address.
  await prisma.user.deleteMany({ where: { email: to } });
  const user = await prisma.user.create({
    data: {
      email: to,
      name: "Léa Morand",
      companyName: "Studio Morand",
      iban: "CH9300762011623852957",
      showBankDetails: true,
      accountHolder: "Léa Morand",
      isDemo: false,
    },
  });
  const client = await prisma.client.create({
    data: { userId: user.id, name: "Café Riviera", email: to, city: "Vevey" },
  });

  const lines = {
    create: [
      { label: "Création logo", quantity: 1, unitPrice: 180000, vatRate: 8.1, position: 0 },
      { label: "Charte graphique", quantity: 1, unitPrice: 240000, vatRate: 8.1, position: 1 },
    ],
  };
  const invoice = await prisma.invoice.create({
    data: {
      userId: user.id,
      clientId: client.id,
      number: "FAC-2026-014",
      status: "OVERDUE",
      currency: "CHF",
      depositPercent: 30,
      issueDate: new Date(Date.now() - 20 * 86400000),
      dueDate: new Date(Date.now() - 8 * 86400000),
      lineItems: lines,
    },
  });
  const quote = await prisma.quote.create({
    data: {
      userId: user.id,
      clientId: client.id,
      number: "DEV-2026-042",
      status: "SENT",
      lineItems: lines,
    },
  });

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  // Space sends out (Resend returns transient 408s under rapid attachment sends);
  // one retry per email.
  const step = async (label: string, fn: () => Promise<{ ok: boolean }>) => {
    let res = await fn();
    if (!res.ok) {
      await sleep(1500);
      res = await fn();
    }
    out[label] = res;
    await sleep(1200);
  };

  const out: Record<string, unknown> = {};
  await step("facture", () => dispatchDocumentSent("FAC", invoice.id));
  await step("devis", () => dispatchDocumentSent("DEV", quote.id));
  await step("relance", () =>
    dispatchReminder(
      invoice.id,
      2,
      "Bonjour Café Riviera,\n\nLa facture FAC-2026-014 est en retard de 8 jours. Merci de procéder au règlement.\n\nCordialement,\nStudio Morand",
    ),
  );
  await step("recu", () => dispatchInvoicePaid(invoice.id));
  await step("devisAccepte", () => dispatchQuoteAccepted(quote.id));
  await step("bienvenue", () => dispatchWelcome(user.id));

  // Cleanup the seeded workspace (emails already sent).
  await prisma.user.delete({ where: { id: user.id } });

  return NextResponse.json({ to, results: out });
}
