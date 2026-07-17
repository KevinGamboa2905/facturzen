"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getWorkspace } from "@/lib/workspace";

type Ok = { ok: boolean; error?: string };

function revalidateSettings() {
  revalidatePath("/app/reglages");
  revalidatePath("/demo/reglages");
  revalidatePath("/app");
}

// Company profile tab: identity + Swiss QR-IBAN + VAT.
export async function updateProfile(input: {
  companyName: string;
  address: string;
  zip: string;
  city: string;
  canton: string;
  country: string;
  iban: string;
  vatEnabled: boolean;
  vatNumber: string;
  logoUrl?: string | null;
}): Promise<Ok> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false, error: "Session introuvable." };

  await prisma.user.update({
    where: { id: ws.userId },
    data: {
      companyName: input.companyName?.trim() || null,
      address: input.address?.trim() || null,
      zip: input.zip?.trim() || null,
      city: input.city?.trim() || null,
      canton: input.canton?.trim() || null,
      country: input.country?.trim() || "CH",
      iban: input.iban?.replace(/\s+/g, "") || null,
      vatEnabled: input.vatEnabled,
      vatNumber: input.vatEnabled ? input.vatNumber?.trim() || null : null,
      ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
    },
  });
  revalidateSettings();
  return { ok: true };
}

// Billing tab: currency, terms, numbering prefixes, default deposit.
export async function updateBilling(input: {
  defaultCurrency: string;
  paymentTermsDays: number;
  defaultVatRate: number;
  defaultDepositPercent: number | null;
  quotePrefix: string;
  invoicePrefix: string;
}): Promise<Ok> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false, error: "Session introuvable." };

  await prisma.user.update({
    where: { id: ws.userId },
    data: {
      defaultCurrency: input.defaultCurrency === "EUR" ? "EUR" : "CHF",
      paymentTermsDays: Number.isFinite(input.paymentTermsDays) ? input.paymentTermsDays : 30,
      defaultVatRate: Number.isFinite(input.defaultVatRate) ? input.defaultVatRate : 8.1,
      defaultDepositPercent:
        input.defaultDepositPercent != null && Number.isFinite(input.defaultDepositPercent)
          ? input.defaultDepositPercent
          : null,
    },
  });

  const prefixes = {
    quotePrefix: input.quotePrefix?.trim() || "DEV",
    invoicePrefix: input.invoicePrefix?.trim() || "FAC",
  };
  await prisma.settings.upsert({
    where: { userId: ws.userId },
    create: { userId: ws.userId, ...prefixes },
    update: prefixes,
  });
  revalidateSettings();
  return { ok: true };
}

// Reminders tab: 3 escalation levels (timing + copy).
export async function updateReminders(input: {
  reminderDay1: number;
  reminderDay2: number;
  reminderDay3: number;
  reminderText1: string;
  reminderText2: string;
  reminderText3: string;
}): Promise<Ok> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false, error: "Session introuvable." };

  const data = {
    reminderDay1: Number.isFinite(input.reminderDay1) ? input.reminderDay1 : 3,
    reminderDay2: Number.isFinite(input.reminderDay2) ? input.reminderDay2 : 10,
    reminderDay3: Number.isFinite(input.reminderDay3) ? input.reminderDay3 : 20,
    reminderText1: input.reminderText1 ?? "",
    reminderText2: input.reminderText2 ?? "",
    reminderText3: input.reminderText3 ?? "",
  };
  await prisma.settings.upsert({
    where: { userId: ws.userId },
    create: { userId: ws.userId, ...data },
    update: data,
  });
  revalidateSettings();
  return { ok: true };
}

// Just-in-time QR-IBAN save (from the builder modal on a first CHF invoice).
export async function saveIban(iban: string): Promise<Ok> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false, error: "Session introuvable." };
  const cleaned = iban?.replace(/\s+/g, "") || "";
  if (!cleaned) return { ok: false, error: "IBAN requis." };
  await prisma.user.update({ where: { id: ws.userId }, data: { iban: cleaned } });
  revalidatePath("/app");
  revalidatePath("/app/factures");
  return { ok: true };
}

// Activation checklist dismissal (persisted, per §2c).
export async function dismissChecklist(): Promise<Ok> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false };
  await prisma.user.update({
    where: { id: ws.userId },
    data: { checklistDismissedAt: new Date() },
  });
  revalidatePath("/app");
  return { ok: true };
}
