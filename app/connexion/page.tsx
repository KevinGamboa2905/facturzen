import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { auth } from "@/auth";
import { Logo } from "@/components/marketing/logo";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export const metadata: Metadata = {
  title: "Connexion — FacturZen",
  description: "Connectez-vous à FacturZen avec Google en 5 secondes.",
  robots: { index: false, follow: false },
};

// Editorial accent: Playfair Display italic on the key words (matches the landing).
function Accent({ children }: { children: React.ReactNode }) {
  return <span className="font-serif font-medium italic">{children}</span>;
}

const ERROR_MESSAGES: Record<string, string> = {
  Configuration:
    "La connexion Google n'est pas encore configurée. Ajoutez vos clés OAuth pour l'activer.",
  AccessDenied: "La connexion a été annulée. Réessayez quand vous voulez.",
  OAuthCallbackError: "La connexion a été annulée. Réessayez quand vous voulez.",
  OAuthSignInError: "La connexion a été annulée. Réessayez quand vous voulez.",
  Callback: "La connexion a été annulée. Réessayez quand vous voulez.",
};

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  // Already signed in → straight to the app, never show the sign-in form.
  const session = await auth();
  if (session?.user) redirect("/app");

  const { error } = await searchParams;
  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? "La connexion a été annulée. Réessayez quand vous voulez.")
    : null;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-12 text-foreground">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Link href="/" aria-label="FacturZen, accueil">
            <Logo />
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-center text-2xl font-semibold tracking-tight text-balance">
            Connectez-vous en <Accent>5 secondes</Accent>
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Un compte Google suffit. Pas de mot de passe, pas de formulaire.
          </p>

          <div className="mt-7">
            <GoogleSignInButton />
          </div>

          {errorMessage && (
            <p
              role="alert"
              aria-live="polite"
              className="mt-4 text-center text-sm text-destructive"
            >
              {errorMessage}
            </p>
          )}

          <div className="mt-6 flex items-center justify-center">
            <Link
              href="/demo"
              className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Ou explorez la démo sans compte
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Vos données sont hébergées en Suisse. Nous ne publions jamais rien en votre nom.
        </p>
      </div>
    </main>
  );
}
