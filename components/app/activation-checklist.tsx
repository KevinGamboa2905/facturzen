"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronRight, X } from "lucide-react";

import type { ChecklistItem } from "@/lib/app/checklist";
import { dismissChecklist } from "@/app/actions/settings";

// "Bien démarrer" activation card (prompt 2 §2c): each item links straight to the
// action; progress is persisted implicitly (derived from data) and the whole card
// is dismissible.
export function ActivationChecklist({
  items,
  done,
  total,
  canDismiss = true,
}: {
  items: ChecklistItem[];
  done: number;
  total: number;
  canDismiss?: boolean;
}) {
  const [hidden, setHidden] = useState(false);
  const [, start] = useTransition();

  if (hidden) return null;

  const pct = Math.round((done / total) * 100);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Bien démarrer</h2>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {done}/{total} — {pct}%
          </p>
        </div>
        {canDismiss && (
          <button
            type="button"
            aria-label="Masquer"
            onClick={() => {
              setHidden(true);
              start(async () => {
                await dismissChecklist();
              });
            }}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>

      <ul className="mt-4 space-y-1">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              prefetch
              className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
            >
              <span
                className={`grid size-5 shrink-0 place-items-center rounded-full border ${
                  item.done
                    ? "border-transparent bg-success text-success-foreground"
                    : "border-border text-transparent"
                }`}
              >
                <Check className="size-3" />
              </span>
              <span className={`flex-1 text-sm ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                {item.label}
              </span>
              {!item.done && (
                <ChevronRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
