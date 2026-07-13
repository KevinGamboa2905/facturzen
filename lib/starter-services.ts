import type { UnitType } from "@/lib/units";

export type StarterService = {
  name: string;
  description: string;
  category: string;
  unitType: UnitType;
  unitPrice: number; // centimes
};

// Never start from a blank page (§1): pre-fill typical services per activity.
// Prices are sensible Swiss defaults the user adjusts, not hard rules.
export const STARTER_SERVICES: Record<string, StarterService[]> = {
  "Design & création": [
    { name: "Logo", description: "Logo vectoriel + variantes", category: "Identité", unitType: "FLAT", unitPrice: 180000 },
    { name: "Charte graphique", description: "Couleurs, typographies, règles d'usage", category: "Identité", unitType: "FLAT", unitPrice: 240000 },
    { name: "Maquette web", description: "Design d'une page, desktop + mobile", category: "Web", unitType: "PAGE", unitPrice: 45000 },
    { name: "Retouche photo", description: "Détourage et colorimétrie, par image", category: "Photo", unitType: "UNIT", unitPrice: 4500 },
    { name: "Jour de shooting", description: "Journée de prise de vue", category: "Photo", unitType: "DAY", unitPrice: 120000 },
    { name: "Déclinaisons print", description: "Flyer, affiche ou carte", category: "Print", unitType: "FLAT", unitPrice: 60000 },
  ],
  Conseil: [
    { name: "Consultation", description: "Séance de conseil", category: "Conseil", unitType: "HOUR", unitPrice: 15000 },
    { name: "Atelier stratégie", description: "Demi-journée d'atelier", category: "Conseil", unitType: "DAY", unitPrice: 140000 },
    { name: "Audit", description: "Analyse et recommandations", category: "Conseil", unitType: "FLAT", unitPrice: 250000 },
    { name: "Suivi mensuel", description: "Accompagnement récurrent", category: "Conseil", unitType: "FLAT", unitPrice: 90000 },
  ],
  Développement: [
    { name: "Développement", description: "Travail de développement à l'heure", category: "Dev", unitType: "HOUR", unitPrice: 13000 },
    { name: "Jour de dev", description: "Journée de développement", category: "Dev", unitType: "DAY", unitPrice: 100000 },
    { name: "Landing page", description: "Page one-shot livrée", category: "Web", unitType: "FLAT", unitPrice: 250000 },
    { name: "Maintenance mensuelle", description: "Forfait maintenance", category: "Dev", unitType: "FLAT", unitPrice: 80000 },
  ],
  Coaching: [
    { name: "Séance individuelle", description: "Séance de coaching 1:1", category: "Coaching", unitType: "HOUR", unitPrice: 12000 },
    { name: "Pack 5 séances", description: "Forfait de cinq séances", category: "Coaching", unitType: "FLAT", unitPrice: 55000 },
    { name: "Atelier de groupe", description: "Session collective", category: "Coaching", unitType: "DAY", unitPrice: 90000 },
  ],
  Artisanat: [
    { name: "Heure d'atelier", description: "Travail en atelier à l'heure", category: "Atelier", unitType: "HOUR", unitPrice: 9000 },
    { name: "Pièce sur mesure", description: "Réalisation personnalisée", category: "Fabrication", unitType: "FLAT", unitPrice: 45000 },
    { name: "Réparation", description: "Diagnostic + réparation", category: "Service", unitType: "FLAT", unitPrice: 12000 },
  ],
  default: [
    { name: "Prestation à l'heure", description: "Travail facturé à l'heure", category: "Général", unitType: "HOUR", unitPrice: 12000 },
    { name: "Journée de travail", description: "Forfait journalier", category: "Général", unitType: "DAY", unitPrice: 90000 },
    { name: "Forfait projet", description: "Prestation au forfait", category: "Général", unitType: "FLAT", unitPrice: 150000 },
  ],
};
