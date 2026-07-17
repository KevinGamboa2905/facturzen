"use server";

import { prisma } from "@/lib/prisma";
import { getWorkspace } from "@/lib/workspace";

export type SearchHit = {
  type: "invoice" | "quote" | "client";
  id: string;
  label: string;
  sub: string;
};

// Cmd+K async search over the workspace: documents by number/client, clients by
// name. Capped at 8 results total (§5).
export async function searchWorkspace(query: string): Promise<SearchHit[]> {
  const ws = await getWorkspace();
  if (!ws) return [];
  const q = query.trim();
  if (!q) return [];

  const [invoices, quotes, clients] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        userId: ws.userId,
        OR: [
          { number: { contains: q, mode: "insensitive" } },
          { client: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      select: { id: true, number: true, client: { select: { name: true } } },
      orderBy: { issueDate: "desc" },
      take: 5,
    }),
    prisma.quote.findMany({
      where: {
        userId: ws.userId,
        OR: [
          { number: { contains: q, mode: "insensitive" } },
          { client: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      select: { id: true, number: true, client: { select: { name: true } } },
      orderBy: { issueDate: "desc" },
      take: 5,
    }),
    prisma.client.findMany({
      where: { userId: ws.userId, name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 5,
    }),
  ]);

  const hits: SearchHit[] = [
    ...invoices.map((i) => ({ type: "invoice" as const, id: i.id, label: i.number, sub: i.client?.name ?? "Facture" })),
    ...quotes.map((q2) => ({ type: "quote" as const, id: q2.id, label: q2.number, sub: q2.client?.name ?? "Devis" })),
    ...clients.map((c) => ({ type: "client" as const, id: c.id, label: c.name, sub: "Client" })),
  ];
  return hits.slice(0, 8);
}
