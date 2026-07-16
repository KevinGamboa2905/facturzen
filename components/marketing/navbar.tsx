"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { LiquidGlassButton } from "@/components/ui/liquid-glass";
import { Logo } from "@/components/marketing/logo";
import { NAV_LINKS } from "@/lib/marketing";
import { cn } from "@/lib/utils";

// Fixed floating nav that condenses into a blurred pill on scroll (Tailark
// pattern). Monochrome. §6: logo, Fonctionnalités, Tarifs, Connexion, CTA.
export function Navbar() {
  const [menuState, setMenuState] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header>
      <nav
        data-state={menuState && "active"}
        aria-label="Navigation principale"
        className="group fixed z-30 w-full px-2"
      >
        <div
          className={cn(
            "mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12",
            isScrolled &&
              "mt-2 max-w-4xl rounded-2xl border border-border bg-background/60 backdrop-blur-lg lg:px-5",
          )}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full justify-between lg:w-auto">
              <Link href="/" aria-label="Facty, accueil" className="flex items-center">
                <Logo />
              </Link>

              <button
                type="button"
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? "Fermer le menu" : "Ouvrir le menu"}
                aria-expanded={menuState}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className="m-auto size-6 duration-200 group-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0" />
                <X className="absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200 group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100" />
              </button>
            </div>

            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex gap-8 text-sm">
                {NAV_LINKS.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="block text-muted-foreground duration-150 hover:text-foreground"
                    >
                      <span>{item.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border border-border bg-background p-6 shadow-2xl shadow-black/5 group-data-[state=active]:block md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none lg:group-data-[state=active]:flex">
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {NAV_LINKS.map((item) => (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        onClick={() => setMenuState(false)}
                        className="block text-muted-foreground duration-150 hover:text-foreground"
                      >
                        <span>{item.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full flex-col gap-3 sm:flex-row md:w-fit">
                <LiquidGlassButton href="/login" className="h-9 rounded-xl px-4 text-sm">
                  Connexion
                </LiquidGlassButton>
                <LiquidGlassButton href="/login" className="h-9 rounded-xl px-4 text-sm">
                  {/* Full CTA normally; short label once condensed. */}
                  <span className={cn(isScrolled && "lg:hidden")}>Créer ma première facture</span>
                  <span className={cn("hidden", isScrolled && "lg:inline")}>Commencer</span>
                </LiquidGlassButton>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
