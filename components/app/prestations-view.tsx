"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Package, Plus, Search, Sparkles, Star, Archive } from "lucide-react";

import { cn } from "@/lib/utils";
import { UNIT_TYPES, formatServicePrice, unitSuffix } from "@/lib/units";
import { formatAmount, formatAmountPlain } from "@/lib/money";
import { STARTER_SERVICES } from "@/lib/starter-services";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import {
  createService,
  updateService,
  toggleServiceFavorite,
  archiveService,
  addStarterServices,
  type ServiceInput,
} from "@/app/actions/services";

export type ServiceDTO = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  unitType: string;
  unitPrice: number;
  vatRate: number;
  currency: string;
  isFavorite: boolean;
  timesUsed: number;
};

export type PackageDTO = {
  id: string;
  name: string;
  description: string | null;
  discountPercent: number | null;
  items: { id: string; quantity: number; service: { name: string; unitPrice: number; currency: string } }[];
};

const emptyForm = {
  name: "",
  description: "",
  category: "",
  unitType: "FLAT",
  unitPriceChf: "",
  vatRate: 8.1,
  currency: "CHF",
};

export function PrestationsView({
  services,
  packages,
  activityType,
}: {
  services: ServiceDTO[];
  packages: PackageDTO[];
  activityType: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [favOverride, setFavOverride] = useState<Record<string, boolean>>({});

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(
    () => [...new Set(services.map((s) => s.category).filter(Boolean) as string[])].sort(),
    [services],
  );

  const isFav = (s: ServiceDTO) => favOverride[s.id] ?? s.isFavorite;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services
      .filter((s) => (category ? s.category === category : true))
      .filter((s) =>
        q
          ? [s.name, s.description, s.category].some((f) => f?.toLowerCase().includes(q))
          : true,
      )
      .sort((a, b) => Number(isFav(b)) - Number(isFav(a)) || b.timesUsed - a.timesUsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services, search, category, favOverride]);

  function openCreate() {
    setEditingId(null);
    setError(null);
    setForm({ ...emptyForm, currency: services[0]?.currency ?? "CHF" });
    setSheetOpen(true);
  }

  function openEdit(s: ServiceDTO) {
    setEditingId(s.id);
    setError(null);
    setForm({
      name: s.name,
      description: s.description ?? "",
      category: s.category ?? "",
      unitType: s.unitType,
      unitPriceChf: (s.unitPrice / 100).toString(),
      vatRate: s.vatRate,
      currency: s.currency,
    });
    setSheetOpen(true);
  }

  function toggleFav(s: ServiceDTO) {
    const next = !isFav(s);
    setFavOverride((o) => ({ ...o, [s.id]: next }));
    startTransition(async () => {
      const res = await toggleServiceFavorite(s.id);
      if (!res.ok) setFavOverride((o) => ({ ...o, [s.id]: !next })); // rollback
      else router.refresh();
    });
  }

  function submit() {
    setError(null);
    const input: ServiceInput = {
      name: form.name,
      description: form.description,
      category: form.category,
      unitType: form.unitType,
      unitPriceChf: form.unitPriceChf,
      vatRate: Number(form.vatRate),
      currency: form.currency,
    };
    startTransition(async () => {
      const res = editingId ? await updateService(editingId, input) : await createService(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSheetOpen(false);
      router.refresh();
    });
  }

  function archive() {
    if (!editingId) return;
    startTransition(async () => {
      const res = await archiveService(editingId);
      if (res.ok) {
        setSheetOpen(false);
        router.refresh();
      }
    });
  }

  function addStarter() {
    startTransition(async () => {
      await addStarterServices(activityType ?? undefined);
      router.refresh();
    });
  }

  const previewCents = Math.round(parseFloat((form.unitPriceChf || "0").replace(",", ".")) * 100) || 0;

  // Empty state → starter pack, never a blank page.
  if (services.length === 0) {
    const starter = STARTER_SERVICES[activityType ?? ""] ?? STARTER_SERVICES.default;
    return (
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
        <Header onCreate={openCreate} />
        <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-xl bg-muted">
            <Package className="size-6 text-muted-foreground" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Votre catalogue, prêt en un clic</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Voici {starter.length} prestations typiques pour votre activité. Ajoutez-les, puis
            ajustez simplement les prix — vous ne partez jamais d&apos;une page blanche.
          </p>
          <ul className="mx-auto mt-6 grid max-w-lg grid-cols-1 gap-2 text-left sm:grid-cols-2">
            {starter.map((s) => (
              <li key={s.name} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span>{s.name}</span>
                <span className="text-muted-foreground tabular-nums">
                  {formatServicePrice(s.unitPrice, "CHF", s.unitType)}
                </span>
              </li>
            ))}
          </ul>
          <button
            onClick={addStarter}
            disabled={pending}
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            <Sparkles className="size-4" />
            Ajouter ces {starter.length} prestations
          </button>
        </div>
        <ServiceSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          form={form}
          setForm={setForm}
          editingId={editingId}
          categories={categories}
          previewCents={previewCents}
          error={error}
          pending={pending}
          onSubmit={submit}
          onArchive={archive}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <Header onCreate={openCreate} />

      {/* Search + category filter */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une prestation…"
            className="pl-9"
            aria-label="Rechercher une prestation"
          />
        </div>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <FilterChip active={category === null} onClick={() => setCategory(null)}>
              Toutes
            </FilterChip>
            {categories.map((c) => (
              <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>
                {c}
              </FilterChip>
            ))}
          </div>
        )}
      </div>

      {/* Services list */}
      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <ul className="divide-y divide-border">
          {filtered.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 sm:px-5">
              <button
                onClick={() => toggleFav(s)}
                aria-label={isFav(s) ? "Retirer des favoris" : "Ajouter aux favoris"}
                aria-pressed={isFav(s)}
                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-warning"
              >
                <Star className={cn("size-4", isFav(s) && "fill-warning text-warning")} />
              </button>

              <button onClick={() => openEdit(s)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium">{s.name}</p>
                {s.description && (
                  <p className="truncate text-xs text-muted-foreground">{s.description}</p>
                )}
              </button>

              {s.category && (
                <span className="hidden shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground sm:inline">
                  {s.category}
                </span>
              )}

              <span className="hidden w-16 shrink-0 text-right text-xs text-muted-foreground tabular-nums md:inline">
                {s.timesUsed}× utilisé
              </span>

              <span className="w-32 shrink-0 text-right text-sm font-medium tabular-nums sm:w-40">
                {formatServicePrice(s.unitPrice, s.currency, s.unitType)}
              </span>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-muted-foreground">
              Aucune prestation ne correspond à votre recherche.
            </li>
          )}
        </ul>
      </div>

      {/* Packs */}
      {packages.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium text-muted-foreground">Packs</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            {packages.map((p) => {
              const gross = p.items.reduce((sum, it) => sum + it.quantity * it.service.unitPrice, 0);
              const net = p.discountPercent ? Math.round(gross * (1 - p.discountPercent / 100)) : gross;
              return (
                <div key={p.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      {p.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{p.description}</p>
                      )}
                    </div>
                    {p.discountPercent ? (
                      <span className="shrink-0 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
                        −{p.discountPercent}%
                      </span>
                    ) : null}
                  </div>
                  <ul className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
                    {p.items.map((it) => (
                      <li key={it.id} className="flex items-center justify-between text-muted-foreground">
                        <span className="truncate">
                          {it.quantity > 1 ? `${it.quantity}× ` : ""}
                          {it.service.name}
                        </span>
                        <span className="tabular-nums">
                          {formatAmount(it.quantity * it.service.unitPrice, it.service.currency as "CHF" | "EUR")}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-sm font-medium">Total du pack</span>
                    <span className="text-sm font-semibold tabular-nums">
                      {p.discountPercent ? (
                        <>
                          <span className="mr-2 text-muted-foreground line-through">{formatAmount(gross)}</span>
                          {formatAmount(net)}
                        </>
                      ) : (
                        formatAmount(net)
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <ServiceSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        form={form}
        setForm={setForm}
        editingId={editingId}
        categories={categories}
        previewCents={previewCents}
        error={error}
        pending={pending}
        onSubmit={submit}
        onArchive={archive}
      />
    </div>
  );
}

function Header({ onCreate }: { onCreate: () => void }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Prestations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Saisissez vos services une fois. Insérez-les en deux lettres dans vos devis et factures.
        </p>
      </div>
      <button
        onClick={onCreate}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-[0.98]"
      >
        <Plus className="size-4" />
        Nouvelle prestation
      </button>
    </header>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

type FormState = typeof emptyForm;

function ServiceSheet({
  open,
  onOpenChange,
  form,
  setForm,
  editingId,
  categories,
  previewCents,
  error,
  pending,
  onSubmit,
  onArchive,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  editingId: string | null;
  categories: string[];
  previewCents: number;
  error: string | null;
  pending: boolean;
  onSubmit: () => void;
  onArchive: () => void;
}) {
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <div className="border-b border-border px-6 py-4">
          <SheetTitle className="text-lg font-semibold">
            {editingId ? "Modifier la prestation" : "Nouvelle prestation"}
          </SheetTitle>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <Field label="Nom">
            <Input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Création logo" autoFocus />
          </Field>

          <Field label="Description" hint="Ce texte apparaîtra sur vos documents">
            <textarea
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              rows={2}
              placeholder="Logo vectoriel + variantes"
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </Field>

          <Field label="Catégorie">
            <Input
              value={form.category}
              onChange={(e) => set({ category: e.target.value })}
              placeholder="Identité"
              list="prestation-categories"
            />
            <datalist id="prestation-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Type d'unité">
              <select
                value={form.unitType}
                onChange={(e) => set({ unitType: e.target.value })}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                {UNIT_TYPES.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Devise">
              <select
                value={form.currency}
                onChange={(e) => set({ currency: e.target.value })}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                <option value="CHF">CHF</option>
                <option value="EUR">EUR</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Prix unitaire (HT)">
              <Input
                value={form.unitPriceChf}
                onChange={(e) => set({ unitPriceChf: e.target.value })}
                inputMode="decimal"
                placeholder="1800"
              />
            </Field>
            <Field label="TVA (%)">
              <Input
                value={String(form.vatRate)}
                onChange={(e) => set({ vatRate: Number(e.target.value) })}
                inputMode="decimal"
                placeholder="8.1"
              />
            </Field>
          </div>

          {/* Live preview */}
          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <p className="text-xs text-muted-foreground">Ce que verra votre client</p>
            <p className="mt-1 text-sm">
              <span className="font-medium">{form.name || "Nom de la prestation"}</span>
              <span className="text-muted-foreground">
                {" — "}
                {formatAmountPlain(previewCents)} {form.currency} {unitSuffix(form.unitType)}
              </span>
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          {editingId ? (
            <button
              onClick={onArchive}
              disabled={pending}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-destructive disabled:opacity-60"
            >
              <Archive className="size-4" />
              Archiver
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <SheetClose className="h-10 rounded-lg px-4 text-sm text-muted-foreground transition-colors hover:text-foreground">
              Annuler
            </SheetClose>
            <button
              onClick={onSubmit}
              disabled={pending}
              className="inline-flex h-10 min-w-28 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            >
              {pending ? "…" : editingId ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
