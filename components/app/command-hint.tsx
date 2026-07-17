"use client";

// Discreet "⌘K" hint in the sidebar (§5). Clicking it opens the palette by
// dispatching the same shortcut the palette listens for.
export function CommandHint() {
  return (
    <button
      type="button"
      onClick={() =>
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))
      }
      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
      aria-label="Ouvrir la recherche (⌘K)"
    >
      <span>Rechercher</span>
      <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-sans text-[10px]">⌘K</kbd>
    </button>
  );
}
