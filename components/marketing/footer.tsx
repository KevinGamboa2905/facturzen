import Link from "next/link";
import { ReceiptText } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#0d0d0d] text-[#f2f2f2]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs">
          <span className="inline-flex items-center gap-2 font-semibold">
            <span className="grid size-8 place-items-center rounded-lg bg-[#f2f2f2] text-[#0d0d0d]">
              <ReceiptText className="size-5" aria-hidden="true" />
            </span>
            <span className="text-lg tracking-tight">
              Factur<span className="text-white/60">Zen</span>
            </span>
          </span>
          <p className="mt-3 text-sm text-white/70">
            La facturation qui court après vos impayés à votre place. Conçu à Genève pour les
            indépendants.
          </p>
        </div>

        <nav aria-label="Liens de pied de page" className="flex flex-col gap-2 text-sm">
          <p className="mb-1 font-medium">Produit</p>
          <a href="/#fonctionnalites" className="text-white/70 hover:text-white">
            Fonctionnalités
          </a>
          <a href="/#tarifs" className="text-white/70 hover:text-white">
            Tarifs
          </a>
          <a href="/#faq" className="text-white/70 hover:text-white">
            Questions fréquentes
          </a>
        </nav>

        <nav aria-label="Compte" className="flex flex-col gap-2 text-sm">
          <p className="mb-1 font-medium">Compte</p>
          <Link href="/login" className="text-white/70 hover:text-white">
            Connexion
          </Link>
          <Link href="/login" className="text-white/70 hover:text-white">
            Créer un compte
          </Link>
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} FacturZen · Genève, Suisse</p>
          <p>QR-facture conforme · TVA suisse · Données hébergées en Suisse</p>
        </div>
      </div>
    </footer>
  );
}
