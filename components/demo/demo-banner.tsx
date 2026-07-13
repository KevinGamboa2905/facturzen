import { LiquidGlassButton } from "@/components/ui/liquid-glass";

// Persistent, non-blocking demo banner (§4). Never closes, never pulses.
export function DemoBanner() {
  return (
    <div className="sticky top-0 z-50 flex h-10 items-center justify-center gap-3 border-b border-border bg-muted px-4 text-xs">
      <p className="truncate text-muted-foreground">
        <span className="font-semibold text-foreground">Mode démo</span>
        <span className="hidden sm:inline">
          {" "}
          — vous explorez le dashboard de Léa, graphiste fictive. Modifiez tout, rien n&apos;est
          définitif.
        </span>
        <span className="sm:hidden"> — rien n&apos;est définitif.</span>
      </p>
      <LiquidGlassButton href="/connexion" className="shrink-0 rounded-lg px-2.5 py-1 text-xs">
        Créer mon compte gratuit
      </LiquidGlassButton>
    </div>
  );
}
