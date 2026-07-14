"use client";

import { useRef, useState } from "react";
import { ImageUp, Loader2, X } from "lucide-react";

// Logo upload field. Posts to /api/upload/logo (storage-backed) and reports the
// resulting URL up to the settings form. When file storage isn't configured
// (prod without Vercel Blob), shows a clear message instead of failing silently.
export function LogoField({
  value,
  onChange,
  enabled,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  enabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload/logo", { method: "POST", body });
      const json = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (json.ok && json.url) onChange(json.url);
      else setError(json.error ?? "Échec de l'upload.");
    } catch {
      setError("Échec de l'upload.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium">Logo</span>
      <div className="flex items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-muted">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Logo" className="size-full object-contain" />
          ) : (
            <ImageUp className="size-5 text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0">
          {enabled ? (
            <>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={busy}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4" />}
                  {value ? "Changer" : "Ajouter un logo"}
                </button>
                {value && (
                  <button
                    type="button"
                    onClick={() => onChange(null)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <X className="size-4" />
                    Retirer
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">PNG, JPG ou SVG — max 2 Mo.</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Stockage de fichiers non configuré — voir DEPLOY.md §6.
            </p>
          )}
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
