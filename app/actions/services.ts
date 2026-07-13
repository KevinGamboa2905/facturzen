"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getWorkspace } from "@/lib/workspace";
import { STARTER_SERVICES } from "@/lib/starter-services";

export type ServiceInput = {
  name: string;
  description?: string;
  category?: string;
  unitType: string;
  unitPriceChf: string | number; // CHF as entered; converted to centimes here
  vatRate: number;
  currency?: string;
};

type Result = { ok: true } | { ok: false; error: string };

function revalidate() {
  revalidatePath("/demo/prestations");
  revalidatePath("/app/prestations");
}

function toCents(chf: string | number): number {
  const n = typeof chf === "string" ? parseFloat(chf.replace(",", ".")) : chf;
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export async function createService(input: ServiceInput): Promise<Result> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false, error: "Session introuvable." };

  const name = input.name?.trim();
  if (!name) return { ok: false, error: "Le nom est requis." };

  const last = await prisma.service.findFirst({
    where: { userId: ws.userId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await prisma.service.create({
    data: {
      userId: ws.userId,
      name,
      description: input.description?.trim() || null,
      category: input.category?.trim() || null,
      unitType: input.unitType,
      unitPrice: toCents(input.unitPriceChf),
      vatRate: input.vatRate,
      currency: input.currency ?? "CHF",
      position: (last?.position ?? -1) + 1,
    },
  });
  revalidate();
  return { ok: true };
}

export async function updateService(id: string, input: ServiceInput): Promise<Result> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false, error: "Session introuvable." };

  const service = await prisma.service.findUnique({ where: { id }, select: { userId: true } });
  if (!service || service.userId !== ws.userId) return { ok: false, error: "Introuvable." };

  const name = input.name?.trim();
  if (!name) return { ok: false, error: "Le nom est requis." };

  await prisma.service.update({
    where: { id },
    data: {
      name,
      description: input.description?.trim() || null,
      category: input.category?.trim() || null,
      unitType: input.unitType,
      unitPrice: toCents(input.unitPriceChf),
      vatRate: input.vatRate,
      currency: input.currency ?? "CHF",
    },
  });
  revalidate();
  return { ok: true };
}

export async function toggleServiceFavorite(id: string): Promise<Result> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false, error: "Session introuvable." };

  const service = await prisma.service.findUnique({ where: { id }, select: { userId: true, isFavorite: true } });
  if (!service || service.userId !== ws.userId) return { ok: false, error: "Introuvable." };

  await prisma.service.update({ where: { id }, data: { isFavorite: !service.isFavorite } });
  revalidate();
  return { ok: true };
}

export async function archiveService(id: string): Promise<Result> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false, error: "Session introuvable." };

  const service = await prisma.service.findUnique({ where: { id }, select: { userId: true } });
  if (!service || service.userId !== ws.userId) return { ok: false, error: "Introuvable." };

  await prisma.service.update({ where: { id }, data: { isArchived: true } });
  revalidate();
  return { ok: true };
}

// Starter pack (§1): fill the catalogue from a page-white state in one click.
export async function addStarterServices(activityType?: string): Promise<Result> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false, error: "Session introuvable." };

  const set = STARTER_SERVICES[activityType ?? ""] ?? STARTER_SERVICES.default;
  const last = await prisma.service.findFirst({
    where: { userId: ws.userId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  let position = (last?.position ?? -1) + 1;

  await prisma.$transaction(
    set.map((s) =>
      prisma.service.create({
        data: {
          userId: ws.userId,
          name: s.name,
          description: s.description,
          category: s.category,
          unitType: s.unitType,
          unitPrice: s.unitPrice,
          vatRate: 8.1,
          currency: "CHF",
          position: position++,
        },
      }),
    ),
  );
  revalidate();
  return { ok: true };
}
