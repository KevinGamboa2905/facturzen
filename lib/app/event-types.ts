// Pure, isomorphic event types + email copy (usable on client and server).
// The DB-writing helpers live in the server-only lib/app/events.ts.

export type EventType =
  | "CREATED"
  | "SENT"
  | "VIEWED"
  | "REMINDER_SENT"
  | "DUE_SOON"
  | "DEPOSIT_PAID"
  | "PAID"
  | "CONVERTED"
  | "CANCELLED"
  | "BALANCE_INVOICED";

export type Tone = "FRIENDLY" | "FIRM" | "FORMAL";
export const TONE_BY_LEVEL: Record<number, Tone> = { 1: "FRIENDLY", 2: "FIRM", 3: "FORMAL" };
export const TONE_LABEL: Record<Tone, string> = {
  FRIENDLY: "cordiale",
  FIRM: "ferme",
  FORMAL: "formelle",
};

export type EmailCopy = { subject: string; body: string };

// The email as it was sent — stored in the event payload so the timeline modal
// shows exactly what the client received.
export function sendEmailCopy(opts: {
  kind: "FAC" | "DEV";
  clientName: string;
  number: string;
  company: string;
  amount: string;
}): EmailCopy {
  const doc = opts.kind === "FAC" ? "la facture" : "le devis";
  return {
    subject: `${opts.kind === "FAC" ? "Facture" : "Devis"} ${opts.number} — ${opts.company}`,
    body:
      `Bonjour ${opts.clientName},\n\n` +
      `Veuillez trouver ci-joint ${doc} ${opts.number} d'un montant de ${opts.amount}.\n\n` +
      `${opts.kind === "FAC" ? "Merci de votre règlement dans les délais indiqués." : "Je reste à votre disposition pour toute question."}\n\n` +
      `Avec mes remerciements,\n${opts.company}`,
  };
}

export function reminderEmailCopy(opts: {
  clientName: string;
  number: string;
  amount: string;
  level: number;
  company: string;
}): EmailCopy {
  const tone = TONE_BY_LEVEL[opts.level] ?? "FRIENDLY";
  if (tone === "FRIENDLY") {
    return {
      subject: `Petit rappel — facture ${opts.number}`,
      body:
        `Bonjour ${opts.clientName},\n\n` +
        `Un petit rappel amical : la facture ${opts.number} de ${opts.amount} arrive à échéance. ` +
        `Si le règlement est déjà parti, merci de ne pas tenir compte de ce message.\n\n` +
        `Belle journée,\n${opts.company}`,
    };
  }
  if (tone === "FIRM") {
    return {
      subject: `Relance — facture ${opts.number} en retard`,
      body:
        `Bonjour ${opts.clientName},\n\n` +
        `La facture ${opts.number} de ${opts.amount} est désormais en retard de paiement. ` +
        `Merci de procéder au règlement dans les meilleurs délais.\n\n` +
        `Cordialement,\n${opts.company}`,
    };
  }
  return {
    subject: `Mise en demeure — facture ${opts.number}`,
    body:
      `Madame, Monsieur,\n\n` +
      `Malgré nos rappels, la facture ${opts.number} de ${opts.amount} demeure impayée. ` +
      `Sans règlement sous 10 jours, nous serons contraints d'engager une procédure de recouvrement.\n\n` +
      `Veuillez agréer nos salutations distinguées,\n${opts.company}`,
  };
}
