"use server";

import { isProduction } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { emailSamples } from "@/lib/email/samples";

// Dev-only: send a rendered sample template to a test address (§5). Guarded so it
// can never run in production.
export async function sendSampleEmail(
  key: string,
  to: string,
): Promise<{ ok: boolean; error?: string; simulated?: boolean }> {
  if (isProduction) return { ok: false, error: "Indisponible en production." };
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { ok: false, error: "Adresse email invalide." };
  const sample = emailSamples().find((s) => s.key === key);
  if (!sample) return { ok: false, error: "Template inconnu." };

  const res = await sendEmail({
    to,
    subject: sample.content.subject,
    html: sample.content.html,
    text: sample.content.text,
    isDemo: false, // real send from the preview tool
  });
  return { ok: res.ok, error: res.error, simulated: res.simulated };
}
