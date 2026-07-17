import "server-only";

import { prisma } from "@/lib/prisma";
import { computeTotals } from "@/lib/totals";
import { formatAmount } from "@/lib/money";
import { absoluteUrl } from "@/lib/env";
import { documentPdfBuffer } from "@/lib/pdf/response";
import { reminderEmailCopy } from "@/lib/app/event-types";
import { sendEmail, type SendResult } from "@/lib/email/send";
import {
  documentSentEmail,
  reminderEmail,
  dueSoonEmail,
  quoteAcceptedEmail,
  invoicePaidEmail,
  welcomeEmail,
} from "@/lib/email/templates";

const noRecipient: SendResult = { ok: true, simulated: true };
const brandOf = (u: { companyName: string | null; logoUrl: string | null }) => ({
  studio: u.companyName || "Facty",
  logoUrl: u.logoUrl,
  brandColor: null,
});
const frDate = (d: Date) => new Intl.DateTimeFormat("fr-CH").format(d);

// Envoi d'un devis ou d'une facture au client final, PDF joint.
export async function dispatchDocumentSent(kind: "FAC" | "DEV", id: string): Promise<SendResult> {
  const doc =
    kind === "FAC"
      ? await prisma.invoice.findUnique({ where: { id }, include: { client: true, lineItems: true, user: true } })
      : await prisma.quote.findUnique({ where: { id }, include: { client: true, lineItems: true, user: true } });
  if (!doc || !doc.client?.email) return noRecipient;

  const currency = (kind === "FAC" ? (doc as { currency: string }).currency : doc.user.defaultCurrency) as "CHF" | "EUR";
  const amount = formatAmount(computeTotals(doc.lineItems).ttc, currency);
  const path = kind === "FAC" ? `/f/${doc.publicToken}` : `/d/${doc.publicToken}`;
  const dueLine = kind === "FAC" ? `Échéance le ${frDate((doc as { dueDate: Date }).dueDate)}` : null;
  const content = documentSentEmail({
    kind,
    brand: brandOf(doc.user),
    clientName: doc.client.name,
    number: doc.number,
    amount,
    url: absoluteUrl(path),
    dueLine,
    ibanNote: kind === "FAC" && doc.user.iban ? `Coordonnées de paiement : IBAN ${doc.user.iban}.` : null,
  });
  const pdf = await documentPdfBuffer(kind, id);
  return sendEmail({
    to: doc.client.email,
    subject: content.subject,
    html: content.html,
    text: content.text,
    replyTo: doc.user.email,
    attachments: pdf ? [{ filename: pdf.filename, content: pdf.buffer }] : undefined,
    isDemo: doc.user.isDemo,
  });
}

// Relance de paiement (niveau 1/2/3) avec le texte rempli, PDF joint.
export async function dispatchReminder(invoiceId: string, level: number, bodyText: string): Promise<SendResult> {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: true, lineItems: true, user: true },
  });
  if (!inv || !inv.client?.email) return noRecipient;
  const amount = formatAmount(computeTotals(inv.lineItems).ttc, inv.currency as "CHF" | "EUR");
  const subject = reminderEmailCopy({
    clientName: inv.client.name,
    number: inv.number,
    amount,
    level,
    company: inv.user.companyName || "Facty",
  }).subject;
  const content = reminderEmail({
    brand: brandOf(inv.user),
    number: inv.number,
    bodyText,
    url: absoluteUrl(`/f/${inv.publicToken}`),
    subject,
    amount,
    level,
    dueLine: `Échéance dépassée le ${frDate(inv.dueDate)}`,
  });
  const pdf = await documentPdfBuffer("FAC", invoiceId);
  return sendEmail({
    to: inv.client.email,
    subject: content.subject,
    html: content.html,
    text: content.text,
    replyTo: inv.user.email,
    attachments: pdf ? [{ filename: pdf.filename, content: pdf.buffer }] : undefined,
    isDemo: inv.user.isDemo,
  });
}

// Rappel doux J−3 avant échéance.
export async function dispatchDueSoon(invoiceId: string): Promise<SendResult> {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: true, lineItems: true, user: true },
  });
  if (!inv || !inv.client?.email) return noRecipient;
  const amount = formatAmount(computeTotals(inv.lineItems).ttc, inv.currency as "CHF" | "EUR");
  const daysUntil = Math.max(0, Math.ceil((inv.dueDate.getTime() - Date.now()) / 86_400_000));
  const content = dueSoonEmail({
    brand: brandOf(inv.user),
    clientName: inv.client.name,
    number: inv.number,
    amount,
    dueDateLabel: frDate(inv.dueDate),
    url: absoluteUrl(`/f/${inv.publicToken}`),
    daysUntil,
  });
  const pdf = await documentPdfBuffer("FAC", invoiceId);
  return sendEmail({
    to: inv.client.email,
    subject: content.subject,
    html: content.html,
    text: content.text,
    replyTo: inv.user.email,
    attachments: pdf ? [{ filename: pdf.filename, content: pdf.buffer }] : undefined,
    isDemo: inv.user.isDemo,
  });
}

// Devis accepté → notifie l'utilisateur (le freelance), pas le client. Famille A.
export async function dispatchQuoteAccepted(quoteId: string): Promise<SendResult> {
  const q = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { client: true, lineItems: true, user: true },
  });
  if (!q || !q.user.email) return noRecipient;
  const amount = formatAmount(computeTotals(q.lineItems).ttc, q.user.defaultCurrency as "CHF" | "EUR");
  const content = quoteAcceptedEmail({
    brand: brandOf(q.user),
    clientName: q.client?.name ?? "Votre client",
    number: q.number,
    convertUrl: absoluteUrl(`/app/devis/${q.id}`),
    amount,
  });
  return sendEmail({
    to: q.user.email,
    subject: content.subject,
    html: content.html,
    text: content.text,
    replyTo: q.user.email,
    isDemo: q.user.isDemo,
  });
}

// Facture marquée payée → remerciement + reçu au client final.
export async function dispatchInvoicePaid(invoiceId: string): Promise<SendResult> {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: true, lineItems: true, user: true },
  });
  if (!inv || !inv.client?.email) return noRecipient;
  const amount = formatAmount(computeTotals(inv.lineItems).ttc, inv.currency as "CHF" | "EUR");
  const content = invoicePaidEmail({
    brand: brandOf(inv.user),
    clientName: inv.client.name,
    number: inv.number,
    amount,
  });
  const pdf = await documentPdfBuffer("FAC", invoiceId);
  return sendEmail({
    to: inv.client.email,
    subject: content.subject,
    html: content.html,
    text: content.text,
    replyTo: inv.user.email,
    attachments: pdf ? [{ filename: pdf.filename, content: pdf.buffer }] : undefined,
    isDemo: inv.user.isDemo,
  });
}

// Bienvenue → l'utilisateur, une seule fois, à la fin de l'onboarding. Famille A.
export async function dispatchWelcome(userId: string): Promise<SendResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.email) return noRecipient;
  const firstName = user.name?.split(" ")[0] || "à bord";
  const content = welcomeEmail({ firstName, appUrl: absoluteUrl("/app/factures/nouvelle") });
  return sendEmail({
    to: user.email,
    subject: content.subject,
    html: content.html,
    text: content.text,
    replyTo: user.email,
    isDemo: user.isDemo,
  });
}
