// Dependency-free HTML email templates (§1). Table-based, inline styles for
// client compatibility; sober design tinted with the freelancer's brand colour.
// All copy is French, vouvoiement.

export type EmailContent = { subject: string; html: string };

const DEFAULT_BRAND = "#4f46e5";

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Render a multi-line plain string as HTML paragraphs.
function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 14px;line-height:1.6;color:#334155;font-size:15px">${escape(block).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

type Brand = { studio: string; logoUrl?: string | null; brandColor?: string | null };

function layout(opts: {
  brand: Brand;
  heading: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  footerNote?: string;
}): string {
  const color = opts.brand.brandColor || DEFAULT_BRAND;
  const header = opts.brand.logoUrl
    ? `<img src="${escape(opts.brand.logoUrl)}" alt="${escape(opts.brand.studio)}" style="max-height:40px;max-width:180px" />`
    : `<span style="font-size:18px;font-weight:700;color:${escape(color)}">${escape(opts.brand.studio)}</span>`;
  const cta = opts.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px"><tr><td style="border-radius:10px;background:${escape(color)}">
         <a href="${escape(opts.cta.url)}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;border-radius:10px">${escape(opts.cta.label)}</a>
       </td></tr></table>`
    : "";

  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f1f5f9;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
        <tr><td style="padding:24px 28px 8px">${header}</td></tr>
        <tr><td style="padding:8px 28px 4px"><h1 style="margin:0 0 12px;font-size:20px;color:#0f172a">${escape(opts.heading)}</h1></td></tr>
        <tr><td style="padding:0 28px 8px">${opts.bodyHtml}${cta}</td></tr>
        <tr><td style="padding:0 28px 28px">
          ${opts.footerNote ? `<p style="margin:12px 0 0;font-size:12px;color:#94a3b8;line-height:1.5">${escape(opts.footerNote)}</p>` : ""}
          <p style="margin:16px 0 0;font-size:11px;color:#cbd5e1">Envoyé via FacturZen pour le compte de ${escape(opts.brand.studio)}.</p>
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`;
}

// 1 · Document sent (quote or invoice) → client final.
export function documentSentEmail(opts: {
  kind: "FAC" | "DEV";
  brand: Brand;
  clientName: string;
  number: string;
  amount: string;
  url: string;
  ibanNote?: string | null;
}): EmailContent {
  const isInvoice = opts.kind === "FAC";
  const noun = isInvoice ? "la facture" : "le devis";
  const subject = `${opts.brand.studio} vous a envoyé ${noun} ${opts.number}`;
  const body =
    `<p style="margin:0 0 14px;line-height:1.6;color:#334155;font-size:15px">Bonjour ${escape(opts.clientName)},</p>` +
    `<p style="margin:0 0 18px;line-height:1.6;color:#334155;font-size:15px">${escape(opts.brand.studio)} vous a envoyé ${noun} <strong>${escape(opts.number)}</strong> d'un montant de <strong>${escape(opts.amount)}</strong>. Le document est joint à cet email.</p>` +
    (isInvoice && opts.ibanNote
      ? `<p style="margin:0 0 14px;line-height:1.6;color:#64748b;font-size:13px">${escape(opts.ibanNote)}</p>`
      : "");
  return {
    subject,
    html: layout({
      brand: opts.brand,
      heading: `${isInvoice ? "Facture" : "Devis"} ${opts.number}`,
      bodyHtml: body,
      cta: { label: isInvoice ? "Consulter et payer" : "Consulter et signer", url: opts.url },
      footerNote: "Vous pouvez répondre directement à cet email pour toute question.",
    }),
  };
}

// 2 · Payment reminder (levels 1/2/3) → client final. bodyText already has its
// variables filled from the user's reminder settings.
export function reminderEmail(opts: {
  brand: Brand;
  number: string;
  bodyText: string;
  url: string;
  subject: string;
}): EmailContent {
  return {
    subject: opts.subject,
    html: layout({
      brand: opts.brand,
      heading: `Facture ${opts.number}`,
      bodyHtml: paragraphs(opts.bodyText),
      cta: { label: "Consulter et payer", url: opts.url },
      footerNote: "La facture est jointe à cet email.",
    }),
  };
}

// 3 · Gentle reminder a few days before the due date → client final.
export function dueSoonEmail(opts: {
  brand: Brand;
  clientName: string;
  number: string;
  amount: string;
  dueDateLabel: string;
  url: string;
}): EmailContent {
  const body =
    `<p style="margin:0 0 14px;line-height:1.6;color:#334155;font-size:15px">Bonjour ${escape(opts.clientName)},</p>` +
    `<p style="margin:0 0 18px;line-height:1.6;color:#334155;font-size:15px">Petit rappel amical : la facture <strong>${escape(opts.number)}</strong> de <strong>${escape(opts.amount)}</strong> arrive à échéance le <strong>${escape(opts.dueDateLabel)}</strong>. Si le règlement est déjà parti, merci de ne pas en tenir compte.</p>`;
  return {
    subject: `Rappel — facture ${opts.number} à échéance le ${opts.dueDateLabel}`,
    html: layout({
      brand: opts.brand,
      heading: `Facture ${opts.number}`,
      bodyHtml: body,
      cta: { label: "Consulter et payer", url: opts.url },
    }),
  };
}

// 4 · Quote accepted → the FacturZen user (freelancer).
export function quoteAcceptedEmail(opts: {
  brand: Brand;
  clientName: string;
  number: string;
  convertUrl: string;
}): EmailContent {
  const body =
    `<p style="margin:0 0 18px;line-height:1.6;color:#334155;font-size:15px"><strong>${escape(opts.clientName)}</strong> a accepté le devis <strong>${escape(opts.number)}</strong>. Vous pouvez le convertir en facture en un clic.</p>`;
  return {
    subject: `${opts.clientName} a accepté le devis ${opts.number}`,
    html: layout({
      brand: opts.brand,
      heading: "Devis accepté 🎉",
      bodyHtml: body,
      cta: { label: "Convertir en facture", url: opts.convertUrl },
    }),
  };
}

// 5 · Invoice paid → thank-you + receipt to the client final.
export function invoicePaidEmail(opts: {
  brand: Brand;
  clientName: string;
  number: string;
  amount: string;
}): EmailContent {
  const body =
    `<p style="margin:0 0 14px;line-height:1.6;color:#334155;font-size:15px">Bonjour ${escape(opts.clientName)},</p>` +
    `<p style="margin:0 0 18px;line-height:1.6;color:#334155;font-size:15px">Nous confirmons la réception de votre paiement de <strong>${escape(opts.amount)}</strong> pour la facture <strong>${escape(opts.number)}</strong>. Le reçu est joint à cet email. Merci de votre confiance.</p>`;
  return {
    subject: `Reçu — facture ${opts.number} payée`,
    html: layout({
      brand: opts.brand,
      heading: "Merci pour votre paiement",
      bodyHtml: body,
      footerNote: "Le reçu (facture acquittée) est joint à cet email.",
    }),
  };
}
