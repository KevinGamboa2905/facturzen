"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LiquidGlassButton } from "@/components/ui/liquid-glass";
import { useToast } from "@/components/ui/toast";
import { updateClient, deleteClient } from "@/app/actions/clients";

export type EditableClient = {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
  zip: string | null;
  city: string | null;
  notes: string | null;
};

const label = "mb-1 block text-sm font-medium";

export function ClientActions({ client, basePath }: { client: EditableClient; basePath: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  function remove() {
    start(async () => {
      const res = await deleteClient(client.id);
      if (res.ok) {
        toast("Client supprimé");
        router.push(`${basePath}/clients`);
      } else {
        setConfirming(false);
        toast(res.error ?? "Suppression impossible");
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Pencil className="size-4" />
          Modifier
        </button>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
        >
          <Trash2 className="size-4" />
          Supprimer
        </button>
      </div>

      {editing && (
        <ClientEditModal
          client={client}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            toast("Enregistré ✓");
            router.refresh();
          }}
        />
      )}

      {confirming && (
        <Modal open onClose={() => setConfirming(false)} title="Supprimer ce client ?">
          <p className="text-sm text-muted-foreground">
            Cette action est définitive. Un client rattaché à des devis ou factures ne peut pas être
            supprimé.
          </p>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="h-10 flex-1 rounded-xl border border-border text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-destructive text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-70"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Supprimer
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function ClientEditModal({
  client,
  onClose,
  onSaved,
}: {
  client: EditableClient;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(client.name);
  const [email, setEmail] = useState(client.email ?? "");
  const [address, setAddress] = useState(client.address ?? "");
  const [zip, setZip] = useState(client.zip ?? "");
  const [city, setCity] = useState(client.city ?? "");
  const [notes, setNotes] = useState(client.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const res = await updateClient(client.id, { name, email, address, zip, city, notes });
      if (res.ok) onSaved();
      else setError(res.error ?? "Une erreur est survenue.");
    });
  }

  return (
    <Modal open onClose={onClose} title="Modifier le client">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-3"
      >
        <div>
          <label htmlFor="e-name" className={label}>
            Nom <span className="text-destructive">*</span>
          </label>
          <Input id="e-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
        </div>
        <div>
          <label htmlFor="e-email" className={label}>
            Email
          </label>
          <Input id="e-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" />
        </div>
        <div>
          <label htmlFor="e-addr" className={label}>
            Adresse
          </label>
          <Input id="e-addr" value={address} onChange={(e) => setAddress(e.target.value)} className="h-10" />
        </div>
        <div className="grid grid-cols-[100px_1fr] gap-3">
          <div>
            <label htmlFor="e-zip" className={label}>
              NPA
            </label>
            <Input id="e-zip" value={zip} onChange={(e) => setZip(e.target.value)} className="h-10" />
          </div>
          <div>
            <label htmlFor="e-city" className={label}>
              Ville
            </label>
            <Input id="e-city" value={city} onChange={(e) => setCity(e.target.value)} className="h-10" />
          </div>
        </div>
        <div>
          <label htmlFor="e-notes" className={label}>
            Notes
          </label>
          <Textarea id="e-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <LiquidGlassButton type="submit" disabled={pending} className="h-10 w-full rounded-xl px-4 text-sm">
          {pending && <Loader2 className="size-4 animate-spin" />}
          Enregistrer
        </LiquidGlassButton>
      </form>
    </Modal>
  );
}
