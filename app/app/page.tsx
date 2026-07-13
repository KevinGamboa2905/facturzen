// Dashboard placeholder — the real stat cards, chart and activation checklist
// land in §2c/§4. Reachable only for onboarded, signed-in users (see layout).
export default function AppHomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
      <p className="mt-2 text-muted-foreground">
        Bientôt : votre chiffre d&apos;affaires, vos devis et vos factures en un coup d&apos;œil.
      </p>
    </main>
  );
}
