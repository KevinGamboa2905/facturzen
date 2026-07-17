import { absoluteUrl } from "@/lib/env";
import {
  documentSentEmail,
  reminderEmail,
  dueSoonEmail,
  quoteAcceptedEmail,
  invoicePaidEmail,
  welcomeEmail,
  type EmailContent,
} from "@/lib/email/templates";

export type EmailSample = {
  key: string;
  label: string;
  family: "A" | "B";
  content: EmailContent;
};

// Fake "Léa Morand / Studio Morand" data to render every template in the dev
// preview and the "send me this" action — one source so preview == what sends.
const brand = { studio: "Studio Morand", logoUrl: null, brandColor: "#7C3AED" };
const client = "Café Riviera";

export function emailSamples(): EmailSample[] {
  return [
    {
      key: "facture-sent",
      label: "Facture envoyée",
      family: "B",
      content: documentSentEmail({
        kind: "FAC",
        brand,
        clientName: client,
        number: "FAC-2026-015",
        amount: "1'840.00 CHF",
        url: absoluteUrl("/f/apercu"),
        dueLine: "Échéance le 30.06.2026",
        ibanNote: "Coordonnées de paiement : IBAN CH93 0076 2011 6238 5295 7.",
      }),
    },
    {
      key: "devis-sent",
      label: "Devis envoyé",
      family: "B",
      content: documentSentEmail({
        kind: "DEV",
        brand,
        clientName: client,
        number: "DEV-2026-042",
        amount: "3'200.00 CHF",
        url: absoluteUrl("/d/apercu"),
      }),
    },
    {
      key: "reminder",
      label: "Relance (niveau 2)",
      family: "B",
      content: reminderEmail({
        brand,
        number: "FAC-2026-015",
        bodyText:
          "Bonjour Café Riviera,\n\nLa facture FAC-2026-015 de 1'840.00 CHF est en retard de 12 jours. Merci de procéder au règlement dans les meilleurs délais.\n\nCordialement,\nStudio Morand",
        url: absoluteUrl("/f/apercu"),
        subject: "Relance — facture FAC-2026-015 en retard",
        amount: "1'840.00 CHF",
        level: 2,
        dueLine: "Échéance dépassée le 30.06.2026",
      }),
    },
    {
      key: "due-soon",
      label: "Rappel J−3",
      family: "B",
      content: dueSoonEmail({
        brand,
        clientName: client,
        number: "FAC-2026-051",
        amount: "920.00 CHF",
        dueDateLabel: "20.07.2026",
        url: absoluteUrl("/f/apercu"),
        daysUntil: 3,
      }),
    },
    {
      key: "invoice-paid",
      label: "Facture payée (reçu)",
      family: "B",
      content: invoicePaidEmail({
        brand,
        clientName: client,
        number: "FAC-2026-015",
        amount: "1'840.00 CHF",
      }),
    },
    {
      key: "quote-accepted",
      label: "Devis accepté (→ vous)",
      family: "A",
      content: quoteAcceptedEmail({
        brand,
        clientName: client,
        number: "DEV-2026-042",
        convertUrl: absoluteUrl("/app/devis/apercu"),
        amount: "3'200.00 CHF",
      }),
    },
    {
      key: "welcome",
      label: "Bienvenue (→ vous)",
      family: "A",
      content: welcomeEmail({ firstName: "Léa", appUrl: absoluteUrl("/app/factures/nouvelle") }),
    },
  ];
}
