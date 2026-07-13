"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getWorkspace } from "@/lib/workspace";

// Inline client creation from the builder combobox (§3: never leave the builder).
export async function createClientQuick(
  name: string,
): Promise<{ ok: boolean; client?: { id: string; name: string; city: string | null; email: string | null } }> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false };
  const trimmed = name.trim();
  if (!trimmed) return { ok: false };

  const client = await prisma.client.create({
    data: { userId: ws.userId, name: trimmed, country: "CH" },
    select: { id: true, name: true, city: true, email: true },
  });
  revalidatePath("/demo/clients");
  revalidatePath("/app/clients");
  return { ok: true, client };
}

export type NewClientInput = {
  name: string;
  email?: string;
  address?: string;
  zip?: string;
  city?: string;
  country?: string;
  notes?: string;
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Full inline/sheet creation (§1) — name + email required, address optional.
export async function createClient(
  input: NewClientInput,
): Promise<{ ok: boolean; error?: string; client?: { id: string; name: string; city: string | null; email: string | null } }> {
  const ws = await getWorkspace();
  if (!ws) return { ok: false, error: "Session introuvable." };

  const name = input.name?.trim();
  if (!name) return { ok: false, error: "Le nom est requis." };
  const email = input.email?.trim() || "";
  if (!email) return { ok: false, error: "L'email est requis." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Adresse email invalide." };

  const client = await prisma.client.create({
    data: {
      userId: ws.userId,
      name,
      email,
      address: input.address?.trim() || null,
      zip: input.zip?.trim() || null,
      city: input.city?.trim() || null,
      country: input.country?.trim() || "CH",
      notes: input.notes?.trim() || null,
    },
    select: { id: true, name: true, city: true, email: true },
  });
  revalidatePath("/demo/clients");
  revalidatePath("/app/clients");
  return { ok: true, client };
}
