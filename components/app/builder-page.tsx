import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getWorkspace, getServices } from "@/lib/workspace";
import { DocumentBuilder } from "@/components/app/document-builder";
import type { DocKind } from "@/app/actions/documents";

export async function BuilderPage({ kind, id }: { kind: DocKind; id: string }) {
  const ws = await getWorkspace();
  if (!ws) notFound();

  const [user, clientRows, serviceRows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: ws.userId },
      select: { companyName: true, city: true, defaultCurrency: true },
    }),
    prisma.client.findMany({
      where: { userId: ws.userId },
      select: { id: true, name: true, city: true, email: true },
      orderBy: { name: "asc" },
    }),
    getServices(ws.userId),
  ]);

  const doc =
    kind === "FAC"
      ? await prisma.invoice.findUnique({ where: { id }, include: { lineItems: { orderBy: { position: "asc" } } } })
      : await prisma.quote.findUnique({ where: { id }, include: { lineItems: { orderBy: { position: "asc" } } } });
  if (!doc || doc.userId !== ws.userId) notFound();

  const currency = kind === "FAC" ? (doc as { currency: string }).currency : user?.defaultCurrency ?? "CHF";

  return (
    <DocumentBuilder
      kind={kind}
      docId={doc.id}
      number={doc.number}
      status={doc.status}
      amountPaid={kind === "FAC" ? (doc as { amountPaid: number }).amountPaid : 0}
      dueDate={kind === "FAC" ? (doc as { dueDate: Date }).dueDate.toISOString() : null}
      convertedInvoiceId={kind === "DEV" ? (doc as { convertedInvoiceId: string | null }).convertedInvoiceId : null}
      currency={currency}
      company={{ name: user?.companyName ?? "Mon entreprise", city: user?.city ?? null }}
      clients={clientRows}
      services={serviceRows.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        unitType: s.unitType,
        unitPrice: s.unitPrice,
        vatRate: s.vatRate,
        isFavorite: s.isFavorite,
        timesUsed: s.timesUsed,
        currency: s.currency,
      }))}
      initial={{
        clientId: doc.clientId,
        depositPercent: (doc as { depositPercent: number | null }).depositPercent,
        lineItems: doc.lineItems.map((li) => ({
          label: li.label,
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          vatRate: li.vatRate,
        })),
      }}
    />
  );
}
