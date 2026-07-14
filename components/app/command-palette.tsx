"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileSignature,
  FileText,
  LayoutDashboard,
  Package,
  Plus,
  Settings,
  Users,
} from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { searchWorkspace, type SearchHit } from "@/app/actions/search";
import { createDraftInvoice, createDraftQuote } from "@/app/actions/documents";

// Cmd+K palette (§5): navigation, actions, and async document/client search.
// Available on /app and /demo (basePath-aware). Cmd/Ctrl+K toggles, Esc closes.
export function CommandPalette({ basePath }: { basePath: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setHits([]);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      searchWorkspace(query).then(setHits);
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  function createDoc(kind: "FAC" | "DEV") {
    setOpen(false);
    setQuery("");
    void (async () => {
      const res = kind === "FAC" ? await createDraftInvoice() : await createDraftQuote();
      if (res.ok && res.id) router.push(`${basePath}/${kind === "FAC" ? "factures" : "devis"}/${res.id}`);
    })();
  }

  const hrefForHit = (h: SearchHit) =>
    h.type === "invoice"
      ? `${basePath}/factures/${h.id}`
      : h.type === "quote"
        ? `${basePath}/devis/${h.id}`
        : `${basePath}/clients/${h.id}`;

  const nav = [
    { label: "Tableau de bord", href: basePath, icon: LayoutDashboard },
    { label: "Factures", href: `${basePath}/factures`, icon: FileText },
    { label: "Devis", href: `${basePath}/devis`, icon: FileSignature },
    { label: "Clients", href: `${basePath}/clients`, icon: Users },
    { label: "Prestations", href: `${basePath}/prestations`, icon: Package },
    { label: "Réglages", href: `${basePath}/reglages`, icon: Settings },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Recherche & commandes">
      <Command shouldFilter={false}>
        <CommandInput value={query} onValueChange={setQuery} placeholder="Rechercher un document, un client, ou naviguer…" />
        <CommandList>
          <CommandEmpty>Aucun résultat.</CommandEmpty>

          {hits.length > 0 && (
            <CommandGroup heading="Résultats">
              {hits.map((h) => (
                <CommandItem key={`${h.type}-${h.id}`} value={`${h.type}-${h.id}`} onSelect={() => go(hrefForHit(h))}>
                  {h.type === "client" ? (
                    <Users className="size-4 text-muted-foreground" />
                  ) : h.type === "quote" ? (
                    <FileSignature className="size-4 text-muted-foreground" />
                  ) : (
                    <FileText className="size-4 text-muted-foreground" />
                  )}
                  <span className="font-medium">{h.label}</span>
                  <span className="text-muted-foreground">· {h.sub}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandGroup heading="Navigation">
            {nav.map((n) => (
              <CommandItem key={n.href} value={`nav-${n.label}`} onSelect={() => go(n.href)}>
                <n.icon className="size-4 text-muted-foreground" />
                {n.label}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Actions">
            <CommandItem value="act-facture" onSelect={() => createDoc("FAC")}>
              <Plus className="size-4 text-muted-foreground" />
              Nouvelle facture
            </CommandItem>
            <CommandItem value="act-devis" onSelect={() => createDoc("DEV")}>
              <Plus className="size-4 text-muted-foreground" />
              Nouveau devis
            </CommandItem>
            <CommandItem value="act-client" onSelect={() => go(`${basePath}/clients`)}>
              <Plus className="size-4 text-muted-foreground" />
              Nouveau client
            </CommandItem>
            <CommandItem value="act-presta" onSelect={() => go(`${basePath}/prestations`)}>
              <Plus className="size-4 text-muted-foreground" />
              Nouvelle prestation
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
