import { NextResponse } from "next/server";

import { isProduction } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { emailSamples } from "@/lib/email/samples";

// Dev-only helper: send every sample template to ?to=<address>. 404 in prod.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (isProduction) return NextResponse.json({ error: "not found" }, { status: 404 });
  const to = new URL(request.url).searchParams.get("to");
  if (!to) return NextResponse.json({ error: "?to= required" }, { status: 400 });

  const results = [];
  for (const s of emailSamples()) {
    const r = await sendEmail({
      to,
      subject: s.content.subject,
      html: s.content.html,
      text: s.content.text,
      isDemo: false,
    });
    results.push({ key: s.key, ok: r.ok, simulated: r.simulated, id: r.id, error: r.error });
  }
  return NextResponse.json({ to, count: results.length, results });
}
