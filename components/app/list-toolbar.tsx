"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";

export type SortOption = { value: string; label: string };

// Shared search + sort toolbar for the list pages (§4). State lives in the URL
// (?q, ?sort) so the browser back button restores it; typing is debounced 300ms;
// "/" focuses the search from anywhere on the page.
export function ListToolbar({
  sortOptions,
  placeholder,
  defaultSort,
}: {
  sortOptions: SortOption[];
  placeholder: string;
  defaultSort: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const urlQ = params.get("q") ?? "";
  const [value, setValue] = useState(urlQ);
  const sort = params.get("sort") ?? defaultSort;

  // Keep local input in sync when the URL changes externally (back/forward).
  useEffect(() => {
    setValue(urlQ);
  }, [urlQ]);

  function pushParams(next: { q?: string; sort?: string }) {
    const sp = new URLSearchParams(params.toString());
    if (next.q !== undefined) {
      if (next.q) sp.set("q", next.q);
      else sp.delete("q");
    }
    if (next.sort !== undefined) sp.set("sort", next.sort);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  // Debounce search input → URL.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function onChange(v: string) {
    setValue(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => pushParams({ q: v.trim() }), 300);
  }

  // "/" focuses search (unless already typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el as HTMLElement)?.isContentEditable;
      if (typing) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-10 pl-9 pr-9"
          aria-label={placeholder}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              setValue("");
              if (timer.current) clearTimeout(timer.current);
              pushParams({ q: "" });
              inputRef.current?.focus();
            }}
            aria-label="Effacer la recherche"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm text-muted-foreground">
        <ArrowUpDown className="size-4" />
        <select
          value={sort}
          onChange={(e) => pushParams({ sort: e.target.value })}
          className="bg-transparent text-foreground outline-none"
          aria-label="Trier"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

// Shared "no results" state for a search.
export function NoResults({ query }: { query: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <div className="mt-5 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <p className="text-sm text-muted-foreground">
        Aucun résultat pour « {query} »
      </p>
      <button
        type="button"
        onClick={() => {
          const sp = new URLSearchParams(params.toString());
          sp.delete("q");
          router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
        }}
        className="mt-2 text-sm text-info transition-colors hover:text-info/80"
      >
        Effacer la recherche
      </button>
    </div>
  );
}
