import "server-only";

import { env, flags, EMAIL_FROM } from "@/lib/env";

export type Attachment = { filename: string; content: Buffer };

export type SendResult = { ok: boolean; id?: string; error?: string; simulated: boolean };

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string | null;
  attachments?: Attachment[];
  // Central demo guard: an isDemo workspace NEVER sends a real email (§2).
  isDemo?: boolean;
};

// The one place any email leaves Facty. It never throws — a failed email
// must never break the business action that triggered it (§1). Returns whether
// the send was real or simulated so the UI can be honest about it.
export async function sendEmail(input: SendEmailInput): Promise<SendResult> {
  const { to, subject, html, replyTo, attachments, isDemo } = input;

  // Simulate when: demo session, or no Resend key configured. Same log shape.
  if (isDemo || !flags.email) {
    console.log(
      `[email:simulated]${isDemo ? " (demo)" : ""} to=${to} subject=${JSON.stringify(subject)}`,
    );
    return { ok: true, simulated: true };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      replyTo: replyTo ?? undefined,
      attachments: attachments?.map((a) => ({ filename: a.filename, content: a.content })),
    });
    if (error) {
      console.error("[email:error]", error);
      return { ok: false, error: error.message, simulated: false };
    }
    console.log(`[email:sent] id=${data?.id} to=${to}`);
    return { ok: true, id: data?.id, simulated: false };
  } catch (e) {
    console.error("[email:error]", e);
    return { ok: false, error: e instanceof Error ? e.message : "envoi échoué", simulated: false };
  }
}
