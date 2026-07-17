import type { Metadata } from "next";
import { Figtree, Playfair_Display } from "next/font/google";
import "./globals.css";
import { env } from "@/lib/env";
import { GlassFilter } from "@/components/ui/liquid-glass";

// Primary UI family: Figtree — a clean, friendly geometric sans for all body/UI.
const figtree = Figtree({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Editorial accent: Playfair Display — used (italic) on the key words of headings.
const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    default: "Facty",
    template: "%s | Facty",
  },
  description:
    "Facty — devis, factures PDF et QR-facture suisse avec relances automatiques, pour les indépendants.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr-CH" className={`${figtree.variable} ${playfair.variable}`}>
      <body className="min-h-dvh flex flex-col">
        <GlassFilter />
        {children}
      </body>
    </html>
  );
}
