import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Bell,
  FileSignature,
  QrCode,
  Wallet,
  Users,
} from "lucide-react";

// All landing copy lives here (§6). Vouvoiement, no exclamation marks, benefits
// before features, specific numbers over adjectives.

export const pains: { title: string }[] = [
  { title: "Vous refaites chaque devis dans Word en copiant le précédent." },
  { title: "Vous n'osez pas relancer ce client qui doit payer depuis 3 semaines." },
  { title: "La QR-facture ? Vous bricolez avec votre e-banking." },
];

export const benefits: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: FileSignature,
    title: "Devis en 2 minutes",
    body: "Templates par métier, catalogue de prestations, le client signe en ligne et le devis devient facture en un clic.",
  },
  {
    icon: Bell,
    title: "Relances qui travaillent pour vous",
    body: "3 niveaux automatiques, polis mais fermes. Vous restez le gentil, FacturZen fait le méchant.",
  },
  {
    icon: QrCode,
    title: "QR-facture native",
    body: "Conforme, générée automatiquement, avec la TVA suisse et le multi-devises CHF / EUR.",
  },
];

export const steps: { title: string; body: string }[] = [
  {
    title: "Créez votre devis",
    body: "Sélectionnez un client, ajoutez vos prestations, l'aperçu se met à jour en direct.",
  },
  {
    title: "Le client signe et paie l'acompte",
    body: "Il reçoit un lien, consulte le devis et le signe en ligne en tapant son nom.",
  },
  {
    title: "La facture part toute seule",
    body: "La facture et sa QR-facture sont générées, et les relances suivent sans vous.",
  },
];

export type Plan = {
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  featured: boolean;
  cta: string;
  icon: LucideIcon;
};

export const plans: Plan[] = [
  {
    name: "Libre",
    price: "0",
    period: "CHF",
    tagline: "Pour démarrer sans risque.",
    features: ["3 factures par mois", "QR-facture conforme", "Export PDF"],
    featured: false,
    cta: "Commencer gratuitement",
    icon: Wallet,
  },
  {
    name: "Indépendant",
    price: "24",
    period: "CHF / mois",
    tagline: "Pour être payé à temps, chaque mois.",
    features: [
      "Factures illimitées",
      "Relances automatiques",
      "Signature de devis en ligne",
      "Acomptes",
      "Votre logo sur les documents",
    ],
    featured: true,
    cta: "Choisir Indépendant",
    icon: BadgeCheck,
  },
  {
    name: "Studio",
    price: "49",
    period: "CHF / mois",
    tagline: "Pour une équipe qui facture à plusieurs.",
    features: ["Multi-utilisateurs", "Export comptable", "Accès API"],
    featured: false,
    cta: "Choisir Studio",
    icon: Users,
  },
];

export const faq: { question: string; answer: string }[] = [
  {
    question: "Les QR-factures générées sont-elles conformes ?",
    answer:
      "Oui. Chaque facture en francs suisses inclut une section QR-facture conforme au standard suisse, avec votre QR-IBAN, la référence et le montant. Votre client la scanne depuis son application bancaire et le paiement est pré-rempli.",
  },
  {
    question: "Comment la TVA suisse est-elle gérée ?",
    answer:
      "Vous définissez votre taux de TVA par défaut et vous pouvez l'ajuster ligne par ligne. FacturZen calcule le total hors taxe, la TVA par taux et le total TTC, et fait figurer votre numéro de TVA sur les documents.",
  },
  {
    question: "Puis-je migrer mes factures depuis Excel ou Word ?",
    answer:
      "Vous n'avez rien à importer pour commencer. Vous créez vos clients et vos prestations une première fois, puis vous les réutilisez. Vos anciens documents restent chez vous ; FacturZen prend le relais à partir de votre prochaine facture.",
  },
  {
    question: "Où sont hébergées mes données et sont-elles en sécurité ?",
    answer:
      "Vos données sont hébergées en Suisse. Elles vous appartiennent et restent exportables à tout moment. L'accès à votre compte est protégé et chaque devis ou facture partagé passe par un lien privé unique.",
  },
  {
    question: "Puis-je annuler mon abonnement quand je veux ?",
    answer:
      "Oui, sans engagement. Vous pouvez changer de formule ou résilier à tout moment depuis vos réglages, et vous conservez l'accès jusqu'à la fin de la période déjà payée.",
  },
];

// Anchors reused by the nav and section ids.
export const NAV_LINKS = [
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#tarifs", label: "Tarifs" },
];
