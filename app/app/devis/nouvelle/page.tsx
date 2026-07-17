import { redirect } from "next/navigation";

import { createDraftQuote } from "@/app/actions/documents";

export const dynamic = "force-dynamic";

// Create a fresh draft quote, then hand off to the builder.
export default async function NewQuotePage() {
  const res = await createDraftQuote();
  redirect(res.ok && res.id ? `/app/devis/${res.id}` : "/app/devis");
}
