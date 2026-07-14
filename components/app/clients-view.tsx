"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Plus, Search, Users } from "lucide-react";

import { formatAmount } from "@/lib/money";
import { Input } from "@/components/ui/input";
import { LiquidGlassButton } from "@/components/ui/liquid-glass";
import { useToast } from "@/components/ui/toast";
import { ClientCreateModal } from "@/components/app/client-create-modal";

export type ClientRow = {
  id: string;
  name: string;
  email: string | null;
  city: string | null;
  zip: string | null;
  total: number; // CHF centimes invoiced
  docCount: number;
};

type Sort = "name" | "total";

// Shared clients list for /app and /demo — search, sort, inline create.
export function ClientsView({ basePath, clients }: { basePath: string; clients: ClientRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("name");
  const [creating, setCreating] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? clients.filter(
          (c) => c.name.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q),
        )
      : clients;
    return [...filtered].sort((a, b) =>
      sort === "total" ? b.total - a.total : a.name.localeCompare(b.name, "fr"),
    );
  }, [clients, query, sort]);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <LiquidGlassButton onClick={() => setCreating(true)} className="h-10 rounded-xl px-4 text-sm">
          <Plus className="size-4" />
          Nouveau client
        </LiquidGlassButton>
      </div>

      {clients.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
            <Users className="size-5" />
          </span>
          <p className="mt-4 text-sm font-medium">Ajoutez votre premier client</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">Nom et email suffisent.</p>
          <LiquidGlassButton onClick={() => setCreating(true)} className="mt-5 h-10 rounded-xl px-4 text-sm">
            <Plus className="size-4" />
            Ajouter un client
          </LiquidGlassButton>
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un client…"
                className="h-10 pl-9"
                aria-label="Rechercher un client"
              />
            </div>
            <button
              type="button"
              onClick={() => setSort((s) => (s === "name" ? "total" : "name"))}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowUpDown className="size-4" />
              {sort === "name" ? "Nom" : "Total facturé"}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((c) => (
              <Link
                key={c.id}
                href={`${basePath}/clients/${c.id}`}
                prefetch
                className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-muted-foreground/40"
              >
                <p className="font-medium">{c.name}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {c.city} {c.zip ? `· ${c.zip}` : ""}
                </p>
                {c.email && <p className="mt-2 truncate text-xs text-muted-foreground">{c.email}</p>}
                <div className="mt-4 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">Total facturé</p>
                  <p className="text-lg font-semibold tabular-nums">{formatAmount(c.total)}</p>
                </div>
              </Link>
            ))}
            {visible.length === 0 && (
              <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
                Aucun client ne correspond à « {query} ».
              </p>
            )}
          </div>
        </>
      )}

      {creating && (
        <ClientCreateModal
          prefillName=""
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            toast("Client ajouté ✓");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
