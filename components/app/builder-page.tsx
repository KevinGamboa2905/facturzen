import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getWorkspace, getServices } from "@/lib/workspace";
import { computeTotals } from "@/lib/totals";
import { DocumentBuilder } from "@/components/app/document-builder";
import { IbanJustInTime } from "@/components/app/iban-just-in-time";
import { DocumentDetailView, type DetailDoc } from "@/components/app/document-detail-view";
import type { TimelineEvent, ScheduledReminder } from "@/components/app/document-timeline";
import type { DocKind } from "@/app/actions/documents";

// Routes a document: a DRAFT opens the editor; anything sent-or-beyond opens the
// read-only detail view (§1). The list links here; the split happens here.
export async function BuilderPage({
  kind,
  id,
  basePath,
}: {
  kind: DocKind;
  id: string;
  basePath: string;
}) {
  const ws = await getWorkspace();
  if (!ws) notFound();

  const doc =
    kind === "FAC"
      ? await prisma.invoice.findUnique({
          where: { id },
          include: {
            lineItems: { orderBy: { position: "asc" } },
            client: true,
            balances: { select: { id: true } },
            reminders: true,
            events: { orderBy: { createdAt: "desc" } },
          },
        })
      : await prisma.quote.findUnique({
          where: { id },
          include: {
            lineItems: { orderBy: { position: "asc" } },
            client: true,
            events: { orderBy: { createdAt: "desc" } },
          },
        });
  if (!doc || doc.userId !== ws.userId) notFound();

  // --- DRAFT → editor -------------------------------------------------------
  if (doc.status === "DRAFT") {
    const [user, clientRows, serviceRows] = await Promise.all([
      prisma.user.findUnique({
        where: { id: ws.userId },
        select: { companyName: true, city: true, defaultCurrency: true, iban: true },
      }),
      prisma.client.findMany({
        where: { userId: ws.userId },
        select: { id: true, name: true, city: true, email: true },
        orderBy: { name: "asc" },
      }),
      getServices(ws.userId),
    ]);

    const currency =
      kind === "FAC" ? (doc as { currency: string }).currency : user?.defaultCurrency ?? "CHF";
    const needsIban = kind === "FAC" && currency === "CHF" && !user?.iban;

    return (
      <>
        {needsIban && <IbanJustInTime />}
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
      </>
    );
  }

  // --- Sent or beyond → read-only detail ------------------------------------
  const total = computeTotals(doc.lineItems).ttc;
  const isInvoice = kind === "FAC";
  const currency = (isInvoice ? (doc as { currency: string }).currency : "CHF") as "CHF" | "EUR";

  const detail: DetailDoc = {
    kind,
    id: doc.id,
    number: doc.number,
    status: doc.status,
    currency,
    amountPaid: isInvoice ? (doc as { amountPaid: number }).amountPaid : 0,
    total,
    depositPercent: (doc as { depositPercent: number | null }).depositPercent,
    dueDate: isInvoice ? (doc as { dueDate: Date }).dueDate.toISOString() : null,
    hasBalanceInvoice: isInvoice ? (doc as { balances: { id: string }[] }).balances.length > 0 : false,
    convertedInvoiceId: !isInvoice ? (doc as { convertedInvoiceId: string | null }).convertedInvoiceId : null,
    client: doc.client ? { id: doc.client.id, name: doc.client.name } : null,
    lineItems: doc.lineItems.map((li) => ({
      label: li.label,
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      vatRate: li.vatRate,
    })),
  };

  const events: TimelineEvent[] = doc.events.map((e) => ({
    id: e.id,
    type: e.type,
    payload: e.payload as TimelineEvent["payload"],
    createdAt: e.createdAt.toISOString(),
  }));

  const scheduled: ScheduledReminder[] = isInvoice
    ? (doc as { reminders: { id: string; level: number; tone: string; scheduledAt: Date; sentAt: Date | null }[] }).reminders
        .filter((r) => r.sentAt === null)
        .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
        .map((r) => ({ id: r.id, level: r.level, tone: r.tone, scheduledAt: r.scheduledAt.toISOString() }))
    : [];

  return <DocumentDetailView basePath={basePath} doc={detail} events={events} scheduled={scheduled} />;
}
