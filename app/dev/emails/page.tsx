import { notFound } from "next/navigation";

import { isProduction } from "@/lib/env";
import { emailSamples } from "@/lib/email/samples";
import { EmailPreview } from "@/components/dev/email-preview";

export const dynamic = "force-dynamic";

// Dev-only email preview (§5): 404 in production.
export default function DevEmailsPage() {
  if (isProduction) notFound();
  const samples = emailSamples().map((s) => ({
    key: s.key,
    label: s.label,
    family: s.family,
    subject: s.content.subject,
    html: s.content.html,
    text: s.content.text,
  }));
  return <EmailPreview samples={samples} defaultTo="kevingamboa2905@gmail.com" />;
}
