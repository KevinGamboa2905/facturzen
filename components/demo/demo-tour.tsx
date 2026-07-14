"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const COOKIE = "fz_tour_seen";

const STEPS: { anchor: string; text: string }[] = [
  { anchor: "stats", text: "Le CA de Léa, en un coup d'œil — tout est cliquable." },
  {
    anchor: "overdue",
    text: "Ces retards ? FacturZen relance tout seul — ouvrez-la pour voir la timeline.",
  },
  { anchor: "quote", text: "Un devis accepté devient une facture en un clic." },
];

type Rect = { top: number; left: number; width: number; height: number };

// Lightweight, dependency-free demo tour (§6). 3 anchored tooltips, dismissible
// by clicking anywhere or Escape, shown once (cookie). Respects reduced motion
// and falls back to a bottom-centered card when the anchor is off-screen (mobile).
export function DemoTour() {
  const pathname = usePathname();
  const [step, setStep] = useState(0);
  const [active, setActive] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);

  // Only on the demo dashboard, and only if never seen.
  useEffect(() => {
    if (pathname !== "/demo") return;
    if (document.cookie.includes(`${COOKIE}=1`)) return;
    // Wait a tick for the dashboard to paint.
    const t = setTimeout(() => setActive(true), 350);
    return () => clearTimeout(t);
  }, [pathname]);

  // Measure the current anchor (DOM read → must happen after paint).
  useEffect(() => {
    if (!active) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${STEPS[step].anchor}"]`);
    const r = el?.getBoundingClientRect();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- measuring the DOM
    setRect(r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null);
  }, [active, step]);

  function finish() {
    document.cookie = `${COOKIE}=1; max-age=${60 * 60 * 24 * 365}; path=/`;
    setActive(false);
  }
  function advance() {
    if (step >= STEPS.length - 1) finish();
    else setStep((s) => s + 1);
  }

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active]);

  if (!active) return null;

  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 640;
  // Tooltip below the anchor on desktop; bottom-centered fallback otherwise.
  const tip =
    rect && isDesktop
      ? {
          top: Math.min(rect.top + rect.height + 12, window.innerHeight - 140),
          left: Math.max(12, Math.min(rect.left, window.innerWidth - 320)),
        }
      : null;

  return (
    <div
      className="fixed inset-0 z-[80] motion-safe:animate-in motion-safe:fade-in"
      onClick={advance}
      role="dialog"
      aria-label="Visite guidée"
    >
      <div className="absolute inset-0 bg-black/40" />

      {rect && (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-white ring-offset-2 ring-offset-transparent"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.001)",
          }}
        />
      )}

      <div
        className="absolute w-[300px] max-w-[calc(100vw-24px)] rounded-xl border border-border bg-card p-4 shadow-xl"
        style={
          tip
            ? { top: tip.top, left: tip.left }
            : { bottom: 88, left: "50%", transform: "translateX(-50%)" }
        }
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-foreground">{STEPS[step].text}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground tabular-nums">
            {step + 1} / {STEPS.length}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={finish}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Passer
            </button>
            <button
              type="button"
              onClick={advance}
              className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-90"
            >
              {step >= STEPS.length - 1 ? "Terminer" : "Suivant"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
