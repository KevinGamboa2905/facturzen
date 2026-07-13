import type { Metadata } from "next";
import { ArrowRight, FileText, MapPin, Percent, QrCode, ShieldCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { LiquidGlassButton } from "@/components/ui/liquid-glass";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { FaqSection } from "@/components/marketing/faq-section";
import { Hero } from "@/components/marketing/hero";
import { PricingSection } from "@/components/marketing/pricing-section";
import { benefits, pains, plans, steps } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "Logiciel de facturation pour indépendants suisses — QR-facture & devis",
  description:
    "FacturZen crée vos devis et factures avec QR-facture suisse et relances automatiques. La facturation pensée pour l'indépendant suisse, payé à temps.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_CH",
    url: "/",
    siteName: "FacturZen",
    title: "FacturZen — facturation & QR-facture pour indépendants suisses",
    description:
      "Devis, factures PDF et QR-facture suisse avec relances automatiques. Pensé pour les indépendants, pas pour les comptables.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FacturZen — facturation & QR-facture pour indépendants suisses",
    description:
      "Devis, factures et QR-facture suisse avec relances automatiques. Facturez en 2 minutes, soyez payé à temps.",
  },
};

// SoftwareApplication structured data for rich results (§7).
const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "FacturZen",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Logiciel de facturation pour indépendants suisses : devis, factures PDF, QR-facture et relances automatiques.",
  offers: plans.map((plan) => ({
    "@type": "Offer",
    name: plan.name,
    price: plan.price,
    priceCurrency: "CHF",
  })),
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "127",
  },
};

const trustItems = [
  { icon: MapPin, label: "Conçu à Genève" },
  { icon: QrCode, label: "QR-facture conforme" },
  { icon: Percent, label: "TVA suisse" },
  { icon: ShieldCheck, label: "Données hébergées en Suisse" },
];

// Editorial emphasis for the key words of a heading: Playfair Display, italic.
// Inherits the heading's color so it works on both light and dark sections.
function Em({ children }: { children: React.ReactNode }) {
  return <span className="font-serif font-medium italic">{children}</span>;
}

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <Hero />

        {/* Trust bar */}
        <section aria-label="Gages de confiance" className="border-b border-border bg-card">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-6 py-5 text-sm text-muted-foreground">
            {trustItems.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-2">
                <item.icon className="size-4 text-primary" aria-hidden="true" />
                {item.label}
              </span>
            ))}
          </div>
        </section>

        {/* Problem */}
        <section aria-labelledby="problem-heading" className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
          <h2 id="problem-heading" className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
            Votre métier, ce n'est <Em>pas la facturation</Em>.
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {pains.map((pain, index) => (
              <Card key={pain.title}>
                <CardContent className="p-6">
                  <span className="mb-4 inline-flex size-8 items-center justify-center rounded-lg bg-secondary text-sm font-semibold tabular-nums text-primary">
                    {index + 1}
                  </span>
                  <p className="text-lg font-medium text-balance">{pain.title}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Solution / features — inverted (near-black) section */}
        <section
          id="fonctionnalites"
          aria-labelledby="solution-heading"
          className="scroll-mt-16 border-y border-border bg-[#0d0d0d] text-[#f2f2f2]"
        >
          <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
            <h2 id="solution-heading" className="max-w-2xl text-2xl font-semibold tracking-tight text-[#f2f2f2] sm:text-3xl">
              De quoi vous concentrer sur votre travail, pas sur vos <Em>impayés</Em>.
            </h2>
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {benefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="rounded-xl border border-white/10 bg-white/5 p-6"
                >
                  <span className="inline-flex size-11 items-center justify-center rounded-lg bg-white/10 text-[#f2f2f2]">
                    <benefit.icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-[#f2f2f2]">{benefit.title}</h3>
                  <p className="mt-2 text-white/70">{benefit.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section aria-labelledby="how-heading" className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
          <h2 id="how-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Comment <Em>ça marche</Em>
          </h2>
          <ol className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="relative">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary text-base font-semibold tabular-nums text-primary-foreground">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Pricing */}
        <PricingSection />

        <FaqSection />

        {/* Final CTA */}
        <section aria-labelledby="cta-heading" className="mx-auto w-full max-w-6xl px-6 py-24">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center text-foreground backdrop-blur-sm sm:px-16">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,rgba(255,255,255,0.06),transparent_70%)]" />
            <h2 id="cta-heading" className="relative mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance">
              Votre prochaine facture peut partir dans <Em>2 minutes</Em>.
            </h2>
            <LiquidGlassButton href="/login" className="relative mt-8 h-12 px-6 text-base">
              Créer ma première facture
              <ArrowRight />
            </LiquidGlassButton>
            <p className="relative mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="size-4" aria-hidden="true" />
              Gratuit jusqu'à 3 factures par mois. Sans carte bancaire.
            </p>
          </div>
        </section>
      </main>
      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
    </>
  );
}
