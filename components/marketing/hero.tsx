"use client";

import Link from "next/link";
import { CircleCheckBig, QrCode, SendHorizonal, Sparkles } from "lucide-react";

import { LiquidGlassButton } from "@/components/ui/liquid-glass";
import { AnimatedGroup } from "@/components/ui/animated-group";
import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";

const transitionVariants = {
  item: {
    hidden: { opacity: 0, filter: "blur(12px)", y: 12 },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: { type: "spring" as const, bounce: 0.3, duration: 1.5 },
    },
  },
};

// Placeholder client wordmarks (no real brand logos) for the trust marquee.
const CLIENTS = ["Aster", "Lumen", "North", "Soleil", "Helvéthiq", "Léman", "Novéo", "Cé­dille"];

// Editorial emphasis: Playfair Display, italic, inherits color.
function Em({ children }: { children: React.ReactNode }) {
  return <span className="font-serif font-medium italic">{children}</span>;
}

export function Hero() {
  return (
    <>
      <section>
        <div className="relative mx-auto max-w-6xl px-6 pt-32 lg:pb-16 lg:pt-48">
          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: { staggerChildren: 0.05, delayChildren: 0.75 },
                  },
                },
                ...transitionVariants,
              }}
            >
              <Link
                href="#fonctionnalites"
                className="mx-auto inline-flex w-fit rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground shadow-sm transition-colors hover:text-foreground"
              >
                La facturation suisse qui avance à votre rythme
              </Link>

              <h1 className="mt-8 text-balance text-4xl font-medium tracking-tight sm:text-5xl md:text-6xl">
                Facturez <Em>plus vite</Em>, sans perdre de temps sur les <Em>relances</Em>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
                Devis, factures PDF, QR-facture et paiements automatisés, le tout pensé pour les
                indépendants qui veulent rester concentrés sur leur métier.
              </p>

              <form action="/login" className="mx-auto mt-10 max-w-sm">
                <label htmlFor="hero-email" className="sr-only">
                  Votre adresse email
                </label>
                <div className="relative grid grid-cols-[1fr_auto] items-center rounded-2xl border border-border bg-card pr-1.5 shadow-sm shadow-black/5 has-[input:focus]:ring-2 has-[input:focus]:ring-ring/40">
                  <SendHorizonal className="pointer-events-none absolute inset-y-0 left-4 my-auto size-4 text-muted-foreground" />
                  <input
                    id="hero-email"
                    name="email"
                    type="email"
                    placeholder="vous@exemple.ch"
                    className="h-12 w-full bg-transparent pl-11 text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <LiquidGlassButton type="submit" className="h-9 rounded-xl px-4 text-sm">
                    <span className="hidden sm:block">Créer ma première facture</span>
                    <span className="sm:hidden">Commencer</span>
                  </LiquidGlassButton>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Gratuit jusqu'à 3 factures par mois. Sans carte bancaire.
                </p>
              </form>
            </AnimatedGroup>

            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: { staggerChildren: 0.05, delayChildren: 1.1 },
                  },
                },
                ...transitionVariants,
              }}
            >
              <div
                aria-hidden
                className="relative mx-auto mt-16 max-w-2xl to-transparent text-left"
              >
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_50%_50%_at_50%_40%,rgba(13,13,13,0.06),transparent_70%)]" />

                {/* Back plate */}
                <div className="absolute inset-0 mx-auto w-80 -translate-x-3 -translate-y-12 rounded-[2rem] border border-border bg-card p-2 [mask-image:linear-gradient(to_bottom,#000_50%,transparent_90%)] sm:-translate-x-6">
                  <div className="relative h-96 overflow-hidden rounded-[1.5rem] border border-border p-2 before:absolute before:inset-0 before:bg-[repeating-linear-gradient(-45deg,var(--border),var(--border)_1px,transparent_1px,transparent_6px)] before:opacity-60" />
                </div>

                {/* Front card with FacturZen widget */}
                <div className="mx-auto w-80 translate-x-4 rounded-[2rem] border border-border bg-muted p-2 backdrop-blur-3xl [mask-image:linear-gradient(to_bottom,#000_55%,transparent_95%)] sm:translate-x-8">
                  <div className="space-y-2 overflow-hidden rounded-[1.5rem] border border-border bg-card p-2 shadow-xl">
                    <InvoiceWidget />
                    <div className="rounded-[1rem] bg-muted p-4 pb-14" />
                  </div>
                </div>
              </div>
            </AnimatedGroup>
          </div>
        </div>
      </section>

      {/* Trust marquee */}
      <section className="pb-16 md:pb-24">
        <div className="group relative m-auto max-w-6xl px-6">
          <div className="flex flex-col items-center md:flex-row">
            <div className="inline md:max-w-44 md:border-r md:border-border md:pr-6">
              <p className="text-center text-sm text-muted-foreground md:text-end">
                Ils facturent déjà avec FacturZen
              </p>
            </div>
            <div className="relative w-full min-w-0 py-6 md:w-[calc(100%-11rem)]">
              <InfiniteSlider className="w-full" speedOnHover={20} speed={40} gap={112}>
                {CLIENTS.map((name) => (
                  <div key={name} className="flex">
                    <span className="mx-auto inline-flex items-center gap-2 text-base font-semibold tracking-tight text-muted-foreground">
                      <Sparkles aria-hidden className="size-4" />
                      {name}
                    </span>
                  </div>
                ))}
              </InfiniteSlider>

              <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-linear-to-r from-background" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-linear-to-l from-background" />
              <ProgressiveBlur
                className="pointer-events-none absolute left-0 top-0 h-full w-20"
                direction="left"
                blurIntensity={1}
              />
              <ProgressiveBlur
                className="pointer-events-none absolute right-0 top-0 h-full w-20"
                direction="right"
                blurIntensity={1}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// Monochrome invoice preview shown inside the framed hero mockup.
function InvoiceWidget() {
  return (
    <div className="relative space-y-3 rounded-[1rem] bg-muted/60 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground">
            <QrCode className="size-4" />
          </span>
          <div className="text-sm font-medium">FAC-2026-014</div>
        </div>
        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          Prête à envoyer
        </span>
      </div>

      <div className="space-y-2">
        <div className="border-b border-border pb-2 text-sm font-medium text-foreground">
          Boulangerie Favre &amp; Fils
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total TTC</span>
          <span className="align-baseline text-xl font-semibold tabular-nums">3&#39;124,09</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 text-xs text-muted-foreground">
          <CircleCheckBig className="size-4 text-foreground" />
          QR-IBAN et référence conformes
        </div>
      </div>
    </div>
  );
}
