import { redirect } from "next/navigation";

import { auth } from "@/auth";

// Onboarding wizard placeholder — the real 3-step flow lands in §2a.
export default async function BienvenuePage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Bienvenue sur FacturZen</h1>
        <p className="mt-2 text-muted-foreground">
          L&apos;assistant de configuration en 3 étapes arrive à la prochaine étape du build.
        </p>
      </div>
    </main>
  );
}
