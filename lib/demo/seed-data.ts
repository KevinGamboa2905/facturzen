// Demo seed — the story of Léa Morand, graphiste indépendante à Lausanne
// (Studio Morand). Every figure is deliberate so the dashboard stats equal the
// sum of these records. Amounts are in centimes; offsets are in days from "now".

export type SeedLineItem = {
  label: string;
  description?: string;
  quantity: number;
  unitPrice: number; // centimes, HT
  vatRate: number;
};

export type SeedReminder = {
  level: number; // 1 | 2 | 3
  tone: "FRIENDLY" | "FIRM" | "FORMAL";
  scheduledOffset: number; // days from now
  sentOffset: number | null; // days from now, null = not sent yet
};

export type SeedInvoice = {
  number: string;
  clientKey: string;
  quoteKey?: string; // set when this invoice was converted from a quote
  depositPercent?: number; // deposit invoice (§2)
  status: "PAID" | "SENT" | "OVERDUE";
  currency: "CHF" | "EUR";
  issueOffset: number;
  dueOffset: number;
  paidOffset: number | null;
  lineItems: SeedLineItem[];
  reminders: SeedReminder[];
};

export type SeedQuote = {
  key: string;
  number: string;
  clientKey: string;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED";
  issueOffset: number;
  validUntilOffset: number;
  depositPercent?: number;
  signatureName?: string;
  signedOffset?: number;
  lineItems: SeedLineItem[];
};

export type SeedClient = {
  key: string;
  name: string;
  email: string;
  address: string;
  city: string;
  zip: string;
  country: string;
  notes?: string;
};

export type SeedService = {
  key: string;
  name: string;
  description?: string;
  category?: string;
  unitType: "HOUR" | "DAY" | "FLAT" | "UNIT" | "WORD" | "PAGE";
  unitPrice: number; // centimes, HT
  isFavorite: boolean;
  timesUsed: number;
};

export type SeedPackage = {
  name: string;
  description?: string;
  discountPercent?: number;
  items: { serviceKey: string; quantity: number }[];
};

export const DEMO_SERVICES: SeedService[] = [
  { key: "logo", name: "Création logo", description: "Logo vectoriel + variantes (couleur, N&B, monogramme)", category: "Identité", unitType: "FLAT", unitPrice: 180000, isFavorite: true, timesUsed: 14 },
  { key: "charte", name: "Charte graphique", description: "Couleurs, typographies, règles d'usage — document PDF", category: "Identité", unitType: "FLAT", unitPrice: 240000, isFavorite: true, timesUsed: 9 },
  { key: "horaire", name: "Création graphique", description: "Travail créatif facturé à l'heure", category: "Création", unitType: "HOUR", unitPrice: 12000, isFavorite: true, timesUsed: 22 },
  { key: "retouche", name: "Retouche photo", description: "Détourage, colorimétrie, nettoyage — par image", category: "Photo", unitType: "UNIT", unitPrice: 4500, isFavorite: false, timesUsed: 30 },
  { key: "page-web", name: "Maquette page web", description: "Design d'une page, desktop + mobile", category: "Web", unitType: "PAGE", unitPrice: 45000, isFavorite: false, timesUsed: 6 },
  { key: "shooting", name: "Jour de shooting", description: "Journée de prise de vue sur site", category: "Photo", unitType: "DAY", unitPrice: 120000, isFavorite: false, timesUsed: 4 },
  { key: "print", name: "Déclinaison print", description: "Flyer, affiche ou carte — prêt à imprimer", category: "Print", unitType: "FLAT", unitPrice: 60000, isFavorite: false, timesUsed: 5 },
  { key: "kit-social", name: "Kit réseaux sociaux", description: "12 templates éditables (posts, stories, bannières)", category: "Web", unitType: "FLAT", unitPrice: 95000, isFavorite: false, timesUsed: 7 },
];

export const DEMO_PACKAGES: SeedPackage[] = [
  {
    name: "Pack identité visuelle",
    description: "Le démarrage complet d'une marque, à tarif préférentiel.",
    discountPercent: 10,
    items: [
      { serviceKey: "logo", quantity: 1 },
      { serviceKey: "charte", quantity: 1 },
      { serviceKey: "print", quantity: 2 },
    ],
  },
];

const VAT = 8.1;

export const DEMO_USER = {
  name: "Léa Morand",
  email: "lea@studio-morand.ch",
  companyName: "Studio Morand",
  activityType: "Design & création",
  address: "Rue de Bourg 12",
  city: "Lausanne",
  zip: "1003",
  country: "CH",
  canton: "VD",
  iban: "CH44 3199 9123 0008 8901 2", // sample QR-IBAN
  vatEnabled: true,
  vatNumber: "CHE-123.456.789 TVA",
  defaultCurrency: "CHF" as const,
  defaultVatRate: VAT,
  paymentTermsDays: 30,
  // The demo simulates a paid Indépendant account so nothing shows locked (§3).
  plan: "INDEP" as const,
};

export const DEMO_CLIENTS: SeedClient[] = [
  { key: "riviera", name: "Café Riviera Sàrl", email: "contact@cafe-riviera.ch", address: "Quai Perdonnet 8", city: "Vevey", zip: "1800", country: "CH", notes: "Client fidèle — habillage saisonnier récurrent." },
  { key: "blanc", name: "Fiduciaire Blanc & Cie", email: "info@blanc-fiduciaire.ch", address: "Rue du Rhône 65", city: "Genève", zip: "1204", country: "CH" },
  { key: "ruche", name: "La Ruche Coworking", email: "hello@laruche-coworking.ch", address: "Av. de Sévelin 20", city: "Lausanne", zip: "1004", country: "CH" },
  { key: "atelier", name: "Atelier Verre & Bois", email: "atelier@verre-et-bois.ch", address: "Grand-Rue 44", city: "Morges", zip: "1110", country: "CH" },
  { key: "nomad", name: "Nomad Sport SA", email: "marketing@nomadsport.ch", address: "Rue de l'Industrie 3", city: "Sion", zip: "1950", country: "CH" },
  { key: "lac", name: "Édition du Lac", email: "redaction@editiondulac.eu", address: "Route de Genève 18", city: "Nyon", zip: "1260", country: "CH", notes: "Facturé en EUR." },
];

export const DEMO_INVOICES: SeedInvoice[] = [
  // --- 7 CHF paid + 1 EUR paid = 8 paid (spread across the year, Jul/Aug dip, Nov peak) ---
  {
    number: "FAC-2025-018", clientKey: "riviera", status: "PAID", currency: "CHF",
    issueOffset: -335, dueOffset: -305, paidOffset: -312, reminders: [],
    lineItems: [{ label: "Refonte carte des menus (3 formats)", quantity: 1, unitPrice: 260000, vatRate: VAT }],
  },
  {
    number: "FAC-2025-021", clientKey: "ruche", status: "PAID", currency: "CHF",
    issueOffset: -300, dueOffset: -270, paidOffset: -268, reminders: [],
    lineItems: [{ label: "Signalétique intérieure — 8 panneaux", quantity: 1, unitPrice: 540000, vatRate: VAT }],
  },
  {
    number: "FAC-2025-024", clientKey: "blanc", status: "PAID", currency: "CHF",
    issueOffset: -268, dueOffset: -238, paidOffset: -240, reminders: [],
    lineItems: [{ label: "Maquettes site vitrine — 5 pages", quantity: 1, unitPrice: 680000, vatRate: VAT }],
  },
  {
    number: "FAC-2025-029", clientKey: "atelier", status: "PAID", currency: "CHF",
    issueOffset: -238, dueOffset: -208, paidOffset: -205, reminders: [],
    lineItems: [
      { label: "Création identité visuelle complète", description: "Logo, charte, papeterie", quantity: 1, unitPrice: 640000, vatRate: VAT },
      { label: "Déclinaison réseaux sociaux", quantity: 1, unitPrice: 140000, vatRate: VAT },
    ],
  },
  {
    number: "FAC-2025-033", clientKey: "nomad", status: "PAID", currency: "CHF",
    issueOffset: -205, dueOffset: -175, paidOffset: -170, reminders: [],
    lineItems: [{ label: "Campagne visuels réseaux — pack 20 visuels", quantity: 1, unitPrice: 560000, vatRate: VAT }],
  },
  {
    number: "FAC-2026-004", clientKey: "lac", status: "PAID", currency: "EUR",
    issueOffset: -150, dueOffset: -120, paidOffset: -118, reminders: [],
    lineItems: [{ label: "Couverture + mise en page ouvrage (120 pages)", quantity: 1, unitPrice: 420000, vatRate: 0 }],
  },
  {
    // Deposit invoice (§2): 30% billed and collected; balance still to invoice.
    // Stored SENT + amountPaid = acompte → displays "Acompte payé" (not "Payée").
    number: "FAC-2026-009", clientKey: "riviera", depositPercent: 30, status: "SENT", currency: "CHF",
    issueOffset: -120, dueOffset: -90, paidOffset: -95, reminders: [],
    lineItems: [{ label: "Habillage vitrine + menus de saison", quantity: 1, unitPrice: 420000, vatRate: VAT }],
  },
  {
    number: "FAC-2026-013", clientKey: "blanc", status: "PAID", currency: "CHF",
    issueOffset: -78, dueOffset: -48, paidOffset: -50, reminders: [],
    lineItems: [{ label: "Rapport annuel — mise en page 32 pages", quantity: 1, unitPrice: 640000, vatRate: VAT }],
  },

  // --- 2 pending (SENT) ---
  {
    number: "FAC-2026-016", clientKey: "nomad", status: "SENT", currency: "CHF",
    issueOffset: -18, dueOffset: 12, paidOffset: null, reminders: [],
    lineItems: [{ label: "Refonte bannières web — 6 formats", quantity: 1, unitPrice: 260000, vatRate: VAT }],
  },
  {
    number: "FAC-2026-017", clientKey: "ruche", quoteKey: "q-ruche", status: "SENT", currency: "CHF",
    issueOffset: -5, dueOffset: 25, paidOffset: null, reminders: [],
    lineItems: [{ label: "Kit réseaux sociaux — 12 templates", quantity: 1, unitPrice: 190000, vatRate: VAT }],
  },

  // --- 2 overdue ---
  {
    // 18 days overdue, two reminders already sent, mise en demeure scheduled in 2 days.
    number: "FAC-2026-015", clientKey: "riviera", status: "OVERDUE", currency: "CHF",
    issueOffset: -48, dueOffset: -18, paidOffset: null,
    lineItems: [{ label: "Menus événementiels + affiches soirée", quantity: 1, unitPrice: 240000, vatRate: VAT }],
    reminders: [
      { level: 1, tone: "FRIENDLY", scheduledOffset: -15, sentOffset: -15 },
      { level: 2, tone: "FIRM", scheduledOffset: -8, sentOffset: -8 },
      { level: 3, tone: "FORMAL", scheduledOffset: 2, sentOffset: null },
    ],
  },
  {
    // 5 days overdue, first reminder scheduled in 2 days.
    number: "FAC-2026-018", clientKey: "atelier", status: "OVERDUE", currency: "CHF",
    issueOffset: -35, dueOffset: -5, paidOffset: null,
    lineItems: [{ label: "Retouches photo produits (lot de 24)", quantity: 1, unitPrice: 105000, vatRate: VAT }],
    reminders: [{ level: 1, tone: "FRIENDLY", scheduledOffset: 2, sentOffset: null }],
  },
];

export const DEMO_QUOTES: SeedQuote[] = [
  {
    // The star action: accepted, not yet converted → "Prêt à facturer".
    key: "q-atelier", number: "DEV-2026-021", clientKey: "atelier", status: "ACCEPTED",
    issueOffset: -14, validUntilOffset: 16, depositPercent: 30,
    signatureName: "Camille Perret", signedOffset: -9,
    lineItems: [
      { label: "Création logo + charte graphique", quantity: 1, unitPrice: 320000, vatRate: VAT },
      { label: "Papeterie (cartes, en-têtes, signature mail)", quantity: 1, unitPrice: 120000, vatRate: VAT },
    ],
  },
  {
    key: "q-ruche", number: "DEV-2026-019", clientKey: "ruche", status: "ACCEPTED",
    issueOffset: -40, validUntilOffset: -10, depositPercent: 20,
    signatureName: "Julien Favre", signedOffset: -34,
    lineItems: [{ label: "Refonte support de présentation — 24 slides", quantity: 1, unitPrice: 280000, vatRate: VAT }],
  },
  {
    key: "q-riviera", number: "DEV-2026-022", clientKey: "riviera", status: "SENT",
    issueOffset: -6, validUntilOffset: 24,
    lineItems: [{ label: "Menu de printemps — illustration + mise en page", quantity: 1, unitPrice: 180000, vatRate: VAT }],
  },
  {
    key: "q-nomad", number: "DEV-2026-023", clientKey: "nomad", status: "DRAFT",
    issueOffset: -2, validUntilOffset: 28,
    lineItems: [
      { label: "Refonte identité visuelle — Nomad Sport", quantity: 1, unitPrice: 480000, vatRate: VAT },
      { label: "Guidelines de marque (PDF)", quantity: 1, unitPrice: 0, vatRate: VAT },
    ],
  },
  {
    key: "q-blanc", number: "DEV-2026-014", clientKey: "blanc", status: "DECLINED",
    issueOffset: -70, validUntilOffset: -40,
    lineItems: [{ label: "Newsletter mensuelle — gabarit + 3 envois", quantity: 1, unitPrice: 220000, vatRate: VAT }],
  },
];
