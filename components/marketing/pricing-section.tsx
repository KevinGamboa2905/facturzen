import { Pricing, type PricingPlan } from "@/components/ui/pricing";

// French / CHF plans (§6). Yearly = ~20% off the monthly rate.
const plans: PricingPlan[] = [
  {
    name: "Libre",
    price: "0",
    yearlyPrice: "0",
    period: "mois",
    features: ["3 factures par mois", "QR-facture conforme", "Export PDF"],
    description: "Pour démarrer sans risque.",
    buttonText: "Commencer gratuitement",
    href: "/login",
    isPopular: false,
  },
  {
    name: "Indépendant",
    price: "24",
    yearlyPrice: "19",
    period: "mois",
    features: [
      "Factures illimitées",
      "Relances automatiques",
      "Signature de devis en ligne",
      "Acomptes",
      "Votre logo sur les documents",
    ],
    description: "Pour être payé à temps, chaque mois.",
    buttonText: "Choisir Indépendant",
    href: "/login",
    isPopular: true,
  },
  {
    name: "Studio",
    price: "49",
    yearlyPrice: "39",
    period: "mois",
    features: ["Multi-utilisateurs", "Export comptable", "Accès API"],
    description: "Pour une équipe qui facture à plusieurs.",
    buttonText: "Choisir Studio",
    href: "/login",
    isPopular: false,
  },
];

export function PricingSection() {
  return (
    <section id="tarifs" aria-labelledby="pricing-heading" className="scroll-mt-16 border-t border-border">
      <div id="pricing-heading" className="sr-only">
        Tarifs
      </div>
      <Pricing
        plans={plans}
        title={
          <>
            Un tarif <span className="font-serif font-medium italic">simple</span>, sans surprise.
          </>
        }
        description="Sans engagement. Vos données sont exportables à tout moment."
      />
    </section>
  );
}
