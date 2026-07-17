// Facty email design system (PROMPT 16). Table-based, inline styles, 600px,
// bulletproof for Gmail / Apple Mail / Outlook, light background only (Gmail
// inverts dark unpredictably). One parameterized layout with two presets:
//   • facty     — Facty speaks to its user (welcome, quote accepted)
//   • userBrand — the user speaks to their client (white-label: user's logo +
//                 colour, Facty reduced to a discreet "Envoyé via Facty" footer)
// All copy is French, vouvoiement.

import { absoluteUrl } from "@/lib/env";

export type EmailContent = { subject: string; html: string; text: string };

// --- The palette. The ONE place hex values live (§6). -----------------------
const C = {
  paper: "#F8F7F4", // warm light page background
  card: "#FFFFFF",
  ink: "#0F172A", // titles + Facty buttons (near-black "encre")
  text: "#334155",
  muted: "#64748B",
  faint: "#94A3B8",
  hairline: "#E2E8F0",
  docBg: "#F1F5F9", // document block card
  white: "#FFFFFF",
  successFg: "#15803D",
  successBg: "#DCFCE7",
  warningFg: "#B45309",
  warningBg: "#FEF3C7",
  infoFg: "#1D4ED8",
  infoBg: "#DBEAFE",
  neutralFg: "#475569",
  neutralBg: "#EEF2F6",
} as const;

const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Editorial serif-italic accent on 1–2 words of a heading (echoes the landing).
export function accent(s: string): string {
  return `<em style="font-family:${SERIF};font-style:italic;font-weight:400">${escape(s)}</em>`;
}

type Tone = "success" | "warning" | "info" | "neutral";
function badge(label: string, tone: Tone): string {
  const fg = tone === "success" ? C.successFg : tone === "warning" ? C.warningFg : tone === "info" ? C.infoFg : C.neutralFg;
  const bg = tone === "success" ? C.successBg : tone === "warning" ? C.warningBg : tone === "info" ? C.infoBg : C.neutralBg;
  return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${bg};color:${fg};font-family:${SANS};font-size:12px;font-weight:600;line-height:1">${escape(label)}</span>`;
}

// Grey document card: number, big TTC amount, optional due line + status badge.
export function documentCard(opts: {
  label: string; // e.g. "Facture" / "Devis"
  number: string;
  amount: string;
  dueLine?: string | null;
  status?: { label: string; tone: Tone } | null;
}): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;background:${C.docBg};border:1px solid ${C.hairline};border-radius:14px">
    <tr><td style="padding:18px 20px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-family:${SANS};font-size:13px;color:${C.muted}">${escape(opts.label)} ${escape(opts.number)}</td>
        <td align="right">${opts.status ? badge(opts.status.label, opts.status.tone) : ""}</td>
      </tr></table>
      <div style="margin-top:6px;font-family:${SANS};font-size:26px;font-weight:700;color:${C.ink};letter-spacing:-0.5px">${escape(opts.amount)}</div>
      ${opts.dueLine ? `<div style="margin-top:2px;font-family:${SANS};font-size:13px;color:${C.muted}">${escape(opts.dueLine)}</div>` : ""}
    </td></tr>
  </table>`;
}

// Body paragraph in the standard body style.
export function p(html: string): string {
  return `<p style="margin:0 0 16px;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.text}">${html}</p>`;
}

// Multi-line plain string → escaped HTML paragraphs (for the user's reminder text).
function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((b) => p(escape(b).replace(/\n/g, "<br/>")))
    .join("");
}

type Brand = { studio: string; logoUrl?: string | null; brandColor?: string | null };

function layout(opts: {
  preset: "facty" | "userBrand";
  brand?: Brand;
  preheader: string;
  heading: string; // may contain accent() HTML — not escaped
  bodyHtml: string;
  documentBlock?: string;
  cta?: { label: string; url: string };
  footer: string;
}): string {
  const isFacty = opts.preset === "facty";
  const studio = opts.brand?.studio ?? "Facty";
  const btnBg = isFacty ? C.ink : opts.brand?.brandColor || C.ink;

  const header = isFacty
    ? `<span style="font-family:${SANS};font-size:20px;font-weight:700;color:${C.ink};letter-spacing:-0.3px">Facty</span>`
    : opts.brand?.logoUrl
      ? `<img src="${escape(opts.brand.logoUrl)}" alt="${escape(studio)}" height="36" style="max-height:36px;max-width:190px;border:0;outline:none;text-decoration:none" />`
      : `<span style="font-family:${SANS};font-size:20px;font-weight:700;color:${opts.brand?.brandColor || C.ink}">${escape(studio)}</span>`;

  const cta = opts.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 8px"><tr>
         <td style="border-radius:999px;background:${btnBg}">
           <a href="${escape(opts.cta.url)}" style="display:inline-block;padding:14px 28px;font-family:${SANS};font-size:15px;font-weight:600;line-height:1.2;color:${C.white};text-decoration:none;border-radius:999px">${escape(opts.cta.label)}</a>
         </td>
       </tr></table>`
    : "";

  const footerBlock = isFacty
    ? `<p style="margin:16px 0 0;font-family:${SANS};font-size:12px;line-height:1.5;color:${C.faint}">${escape(opts.footer)}</p>
       <p style="margin:12px 0 0;font-family:${SANS};font-size:12px;color:${C.faint}">— L'équipe Facty · <a href="${escape(absoluteUrl("/app"))}" style="color:${C.muted}">mon espace</a></p>`
    : `<p style="margin:16px 0 0;font-family:${SANS};font-size:12px;line-height:1.5;color:${C.faint}">${escape(opts.footer)}</p>
       <p style="margin:12px 0 0;font-family:${SANS};font-size:11px;color:${C.faint}">Envoyé via Facty pour le compte de ${escape(studio)}.</p>`;

  // Hidden preheader + spacer to control the inbox preview line.
  const preheader = `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${escape(opts.preheader)}</div><div style="display:none;max-height:0;overflow:hidden;opacity:0">${"&nbsp;&zwnj;".repeat(30)}</div>`;

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="color-scheme" content="light"/><meta name="supported-color-schemes" content="light"/></head>
  <body style="margin:0;padding:0;background:${C.paper};-webkit-text-size-adjust:100%">
    ${preheader}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper}"><tr><td align="center" style="padding:28px 16px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${C.card};border-radius:16px;border:1px solid ${C.hairline}">
        <tr><td style="padding:26px 30px 10px">${header}</td></tr>
        <tr><td style="padding:6px 30px 2px"><h1 style="margin:0 0 14px;font-family:${SANS};font-size:22px;line-height:1.3;font-weight:700;color:${C.ink};letter-spacing:-0.4px">${opts.heading}</h1></td></tr>
        <tr><td style="padding:0 30px">${opts.bodyHtml}${opts.documentBlock ?? ""}${cta}</td></tr>
        <tr><td style="padding:2px 30px 28px"><div style="border-top:1px solid ${C.hairline}">${footerBlock}</div></td></tr>
      </table>
      <p style="margin:16px 0 0;font-family:${SANS};font-size:11px;color:${C.faint}">Facty · Facturation pour indépendants suisses</p>
    </td></tr></table>
  </body></html>`;
}

const textFooterB = (studio: string) => `\n\n— \nEnvoyé via Facty pour le compte de ${studio}.`;
const textFooterA = "\n\n— \nL'équipe Facty";

// =============================================================================
// FAMILY B — the user → their client (white-label)
// =============================================================================

// 1 · Document sent (quote or invoice) → client final.
export function documentSentEmail(opts: {
  kind: "FAC" | "DEV";
  brand: Brand;
  clientName: string;
  number: string;
  amount: string;
  url: string;
  ibanNote?: string | null;
  dueLine?: string | null;
}): EmailContent {
  const isInvoice = opts.kind === "FAC";
  const label = isInvoice ? "Facture" : "Devis";
  const noun = isInvoice ? "la facture" : "le devis";
  const subject = `${opts.brand.studio} — ${label.toLowerCase()} ${opts.number}`;
  const bodyHtml =
    p(`Bonjour ${escape(opts.clientName)},`) +
    p(`${escape(opts.brand.studio)} vous a adressé ${noun} <strong>${escape(opts.number)}</strong>. Le PDF est joint à cet email ; l'essentiel est repris ci-dessous.`) +
    (isInvoice && opts.ibanNote ? p(`<span style="color:${C.muted};font-size:13px">${escape(opts.ibanNote)}</span>`) : "");
  return {
    subject,
    html: layout({
      preset: "userBrand",
      brand: opts.brand,
      preheader: `${opts.brand.studio} vous a envoyé ${noun} ${opts.number} — montant ${opts.amount}.`,
      heading: `${label} ${accent(opts.number)}`,
      bodyHtml,
      documentBlock: documentCard({
        label,
        number: opts.number,
        amount: opts.amount,
        dueLine: opts.dueLine ?? null,
        status: { label: isInvoice ? "À régler" : "À signer", tone: "info" },
      }),
      cta: { label: isInvoice ? "Consulter et payer" : "Consulter et signer", url: opts.url },
      footer: "Vous pouvez répondre directement à cet email pour toute question.",
    }),
    text: `Bonjour ${opts.clientName},\n\n${opts.brand.studio} vous a adressé ${noun} ${opts.number} d'un montant de ${opts.amount}.\n${isInvoice ? "Consulter et payer" : "Consulter et signer"} : ${opts.url}\n\nLe PDF est joint à cet email.${textFooterB(opts.brand.studio)}`,
  };
}

// 2 · Payment reminder (levels 1/2/3) → client final. The user's text stays king.
export function reminderEmail(opts: {
  brand: Brand;
  number: string;
  bodyText: string;
  url: string;
  subject: string;
  amount?: string;
  level?: number;
  dueLine?: string | null;
}): EmailContent {
  const levelLabel = opts.level ? `Relance ${opts.level}` : "Relance";
  return {
    subject: opts.subject,
    html: layout({
      preset: "userBrand",
      brand: opts.brand,
      preheader: `${opts.brand.studio} — facture ${opts.number}${opts.amount ? ` de ${opts.amount}` : ""} en attente de règlement.`,
      heading: `Facture ${accent(opts.number)}`,
      bodyHtml: paragraphs(opts.bodyText),
      documentBlock: opts.amount
        ? documentCard({
            label: "Facture",
            number: opts.number,
            amount: opts.amount,
            dueLine: opts.dueLine ?? null,
            status: { label: levelLabel, tone: "warning" },
          })
        : undefined,
      cta: { label: "Consulter et payer", url: opts.url },
      footer: "La facture est jointe à cet email.",
    }),
    text: `${opts.bodyText}\n\nConsulter et payer : ${opts.url}${textFooterB(opts.brand.studio)}`,
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
  daysUntil?: number;
}): EmailContent {
  const badgeLabel =
    opts.daysUntil != null ? `Échéance dans ${opts.daysUntil} jour${opts.daysUntil > 1 ? "s" : ""}` : "Échéance proche";
  return {
    subject: `Rappel — facture ${opts.number} à échéance le ${opts.dueDateLabel}`,
    html: layout({
      preset: "userBrand",
      brand: opts.brand,
      preheader: `Petit rappel : la facture ${opts.number} de ${opts.amount} arrive à échéance le ${opts.dueDateLabel}.`,
      heading: `Un ${accent("petit rappel")}`,
      bodyHtml:
        p(`Bonjour ${escape(opts.clientName)},`) +
        p(`La facture <strong>${escape(opts.number)}</strong> arrive à échéance le <strong>${escape(opts.dueDateLabel)}</strong>. Si le règlement est déjà parti, merci de ne pas en tenir compte.`),
      documentBlock: documentCard({
        label: "Facture",
        number: opts.number,
        amount: opts.amount,
        dueLine: `Échéance le ${opts.dueDateLabel}`,
        status: { label: badgeLabel, tone: "info" },
      }),
      cta: { label: "Consulter et payer", url: opts.url },
      footer: "La facture est jointe à cet email.",
    }),
    text: `Bonjour ${opts.clientName},\n\nPetit rappel : la facture ${opts.number} de ${opts.amount} arrive à échéance le ${opts.dueDateLabel}.\nConsulter et payer : ${opts.url}${textFooterB(opts.brand.studio)}`,
  };
}

// 5 · Invoice paid → thank-you + receipt to the client final.
export function invoicePaidEmail(opts: {
  brand: Brand;
  clientName: string;
  number: string;
  amount: string;
}): EmailContent {
  return {
    subject: `Reçu — facture ${opts.number} payée`,
    html: layout({
      preset: "userBrand",
      brand: opts.brand,
      preheader: `Paiement de ${opts.amount} bien reçu pour la facture ${opts.number}. Merci !`,
      heading: `Paiement ${accent("bien reçu")}`,
      bodyHtml:
        p(`Bonjour ${escape(opts.clientName)},`) +
        p(`Nous confirmons la réception de votre paiement pour la facture <strong>${escape(opts.number)}</strong>. Merci de votre confiance.`),
      documentBlock: documentCard({
        label: "Facture",
        number: opts.number,
        amount: opts.amount,
        dueLine: "Facture acquittée",
        status: { label: "Payée", tone: "success" },
      }),
      footer: "Le reçu (facture acquittée) est joint à cet email.",
    }),
    text: `Bonjour ${opts.clientName},\n\nNous confirmons la réception de votre paiement de ${opts.amount} pour la facture ${opts.number}. Merci de votre confiance.\n\nLe reçu est joint à cet email.${textFooterB(opts.brand.studio)}`,
  };
}

// =============================================================================
// FAMILY A — Facty → its user
// =============================================================================

// 4 · Quote accepted → the Facty user (freelancer). Sober celebration.
export function quoteAcceptedEmail(opts: {
  brand: Brand; // kept for signature; family A uses Facty chrome
  clientName: string;
  number: string;
  convertUrl: string;
  amount?: string;
}): EmailContent {
  return {
    subject: `${opts.clientName} a accepté le devis ${opts.number}`,
    html: layout({
      preset: "facty",
      preheader: `Bonne nouvelle : ${opts.clientName} a accepté le devis ${opts.number}. Convertissez-le en facture en un clic.`,
      heading: `Devis ${accent("accepté")}`,
      bodyHtml:
        p(`<strong>${escape(opts.clientName)}</strong> vient d'accepter le devis <strong>${escape(opts.number)}</strong>. Il ne reste plus qu'à le convertir en facture — les lignes sont reprises automatiquement.`),
      documentBlock: opts.amount
        ? documentCard({
            label: "Devis",
            number: opts.number,
            amount: opts.amount,
            status: { label: "Accepté", tone: "success" },
          })
        : undefined,
      cta: { label: "Convertir en facture", url: opts.convertUrl },
      footer: "Vous recevez cet email parce qu'un devis vous a été accepté sur Facty.",
    }),
    text: `${opts.clientName} a accepté le devis ${opts.number}${opts.amount ? ` (${opts.amount})` : ""}.\nConvertir en facture : ${opts.convertUrl}${textFooterA}`,
  };
}

// 6 · Welcome → the Facty user, once, at the end of onboarding.
export function welcomeEmail(opts: { firstName: string; appUrl: string }): EmailContent {
  return {
    subject: "Bienvenue sur Facty — créez votre première facture",
    html: layout({
      preset: "facty",
      preheader: "Votre espace Facty est prêt : devis, factures et QR-facture suisse, en 2 minutes.",
      heading: `Bienvenue ${accent(opts.firstName)}`,
      bodyHtml:
        p("Votre espace est prêt. Voici ce que Facty fait pour vous :") +
        `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px"><tbody>
          <tr><td style="padding:2px 0;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.text}">✓ &nbsp;Facturez en 2 minutes, devis et factures compris</td></tr>
          <tr><td style="padding:2px 0;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.text}">✓ &nbsp;QR-facture suisse conforme, générée toute seule</td></tr>
          <tr><td style="padding:2px 0;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.text}">✓ &nbsp;Relances automatiques — soyez payé à temps</td></tr>
        </tbody></table>`,
      cta: { label: "Créer ma première facture", url: opts.appUrl },
      footer: "Une question ? Répondez simplement à cet email.",
    }),
    text: `Bienvenue ${opts.firstName},\n\nVotre espace Facty est prêt :\n- Facturez en 2 minutes (devis + factures)\n- QR-facture suisse conforme, automatique\n- Relances automatiques\n\nCréer ma première facture : ${opts.appUrl}${textFooterA}`,
  };
}
