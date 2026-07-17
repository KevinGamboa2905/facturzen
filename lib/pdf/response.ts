import "server-only";

import type { Prisma, User } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getWorkspace } from "@/lib/workspace";
import { generateDocumentPdf } from "@/lib/pdf/document-pdf";
import { can } from "@/lib/plans";

type InvoiceFull = Prisma.InvoiceGetPayload<{ include: { lineItems: true; client: true } }>;
type QuoteFull = Prisma.QuoteGetPayload<{ include: { lineItems: true; client: true } }>;
type DocFull = InvoiceFull | QuoteFull;

function buildPdfInput(kind: "FAC" | "DEV", doc: DocFull, user: User) {
  return {
    kind,
    number: doc.number,
    issueDate: doc.issueDate,
    dueDate: kind === "FAC" ? (doc as InvoiceFull).dueDate : null,
    validUntil: kind === "DEV" ? (doc as QuoteFull).validUntil : null,
    currency: (kind === "FAC" ? (doc as InvoiceFull).currency : user.defaultCurrency) as "CHF" | "EUR",
    depositPercent: (doc as { depositPercent: number | null }).depositPercent,
    paymentTermsDays: user.paymentTermsDays,
    company: {
      name: user.companyName || "Mon entreprise",
      address: user.address,
      zip: user.zip,
      city: user.city,
      iban: user.iban,
      vatNumber: user.vatNumber,
    },
    removeBranding: can(user, "removeBranding"),
    client: doc.client
      ? {
          name: doc.client.name,
          address: doc.client.address,
          zip: doc.client.zip,
          city: doc.client.city,
          country: doc.client.country,
        }
      : null,
    lineItems: doc.lineItems
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((li) => ({
        label: li.label,
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        vatRate: li.vatRate,
      })),
  };
}

// PDF as a Buffer, for email attachments (§1). No auth/workspace check — callers
// (email dispatch) already own the document; keyed by id. Resilient: any render
// error returns null so the email still goes out (without the attachment).
export async function documentPdfBuffer(
  kind: "FAC" | "DEV",
  id: string,
  opts?: { receipt?: boolean },
): Promise<{ buffer: Buffer; filename: string } | null> {
  try {
    const doc =
      kind === "FAC"
        ? await prisma.invoice.findUnique({ where: { id }, include: { lineItems: true, client: true } })
        : await prisma.quote.findUnique({ where: { id }, include: { lineItems: true, client: true } });
    if (!doc) return null;
    const user = await prisma.user.findUnique({ where: { id: doc.userId } });
    if (!user) return null;
    const buffer = await generateDocumentPdf({ ...buildPdfInput(kind, doc, user), receipt: opts?.receipt });
    const filename = opts?.receipt ? `Recu-${doc.number}.pdf` : `${doc.number}.pdf`;
    return { buffer, filename };
  } catch (e) {
    console.error(`[pdf:error] ${kind} ${id}`, e);
    return null;
  }
}

async function renderPdf(kind: "FAC" | "DEV", doc: DocFull, user: User): Promise<Response> {
  const pdf = await generateDocumentPdf(buildPdfInput(kind, doc, user));

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

// Owner download (workspace-scoped).
export async function pdfResponse(kind: "FAC" | "DEV", id: string): Promise<Response> {
  const ws = await getWorkspace();
  if (!ws) return new Response("Introuvable", { status: 404 });
  const user = await prisma.user.findUnique({ where: { id: ws.userId } });
  if (!user) return new Response("Introuvable", { status: 404 });

  const doc =
    kind === "FAC"
      ? await prisma.invoice.findUnique({ where: { id }, include: { lineItems: true, client: true } })
      : await prisma.quote.findUnique({ where: { id }, include: { lineItems: true, client: true } });
  if (!doc || doc.userId !== ws.userId) return new Response("Introuvable", { status: 404 });

  return renderPdf(kind, doc, user);
}

// Public download via unguessable token (the client-facing link).
export async function pdfResponseByToken(kind: "FAC" | "DEV", token: string): Promise<Response> {
  const doc =
    kind === "FAC"
      ? await prisma.invoice.findUnique({ where: { publicToken: token }, include: { lineItems: true, client: true } })
      : await prisma.quote.findUnique({ where: { publicToken: token }, include: { lineItems: true, client: true } });
  if (!doc) return new Response("Introuvable", { status: 404 });
  const user = await prisma.user.findUnique({ where: { id: doc.userId } });
  if (!user) return new Response("Introuvable", { status: 404 });

  return renderPdf(kind, doc, user);
}
