import { redirect } from "next/navigation";

import { createDraftInvoice } from "@/app/actions/documents";

export const dynamic = "force-dynamic";

// Create a fresh draft invoice, then hand off to the builder. Lets links point
// at a stable /nouvelle URL instead of needing a client button.
export default async function NewInvoicePage() {
  const res = await createDraftInvoice();
  redirect(res.ok && res.id ? `/app/factures/${res.id}` : "/app/factures");
}
