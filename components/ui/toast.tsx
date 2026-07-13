"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Check, X } from "lucide-react";

type Tone = "success" | "error";
type Toast = { id: number; message: string; tone: Tone };

const ToastCtx = createContext<{ toast: (message: string, tone?: Tone) => void }>({ toast: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: Tone = "success") => {
    const id = Date.now() + Math.random();
    // Never stack more than 2 (§5).
    setToasts((t) => [...t.slice(-1), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200"
          >
            {t.tone === "error" ? (
              <X className="size-4 shrink-0 text-destructive" />
            ) : (
              <Check className="size-4 shrink-0 text-success" />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
