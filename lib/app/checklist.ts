import type { WorkspaceData } from "@/lib/workspace";

export type ChecklistItem = { key: string; label: string; done: boolean; href: string };

// Activation checklist (prompt 2 §2c). Progress is derived from real data, so it
// updates itself as the user acts — no separate tracking to keep in sync.
export function computeChecklist(
  basePath: string,
  data: WorkspaceData,
  remindersCustomized: boolean,
): { items: ChecklistItem[]; done: number; total: number } {
  const hasSentDoc =
    data.invoices.some((i) => i.status !== "DRAFT") ||
    data.quotes.some((q) => q.status !== "DRAFT");

  const items: ChecklistItem[] = [
    { key: "account", label: "Compte créé", done: true, href: `${basePath}/reglages` },
    { key: "client", label: "Ajouter un client", done: data.clients.length > 0, href: `${basePath}/clients` },
    {
      key: "document",
      label: "Envoyer un premier devis ou une facture",
      done: hasSentDoc,
      href: `${basePath}/factures`,
    },
    { key: "iban", label: "Ajouter votre QR-IBAN", done: Boolean(data.user.iban), href: `${basePath}/reglages` },
    {
      key: "reminders",
      label: "Personnaliser les relances",
      done: remindersCustomized,
      href: `${basePath}/reglages`,
    },
  ];

  return { items, done: items.filter((i) => i.done).length, total: items.length };
}
