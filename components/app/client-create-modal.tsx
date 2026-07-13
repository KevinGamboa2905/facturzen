"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { LiquidGlassButton } from "@/components/ui/liquid-glass";
import { createClient } from "@/app/actions/clients";

type CreatedClient = { id: string; name: string; city: string | null; email: string | null };

// Compact inline client creation (§1b): name + email, address optional. Mounted
// only when needed (keyed on prefill) so the fields reset and autofocus each time.
export function ClientCreateModal({
  prefillName,
  onClose,
  onCreated,
}: {
  prefillName: string;
  onClose: () => void;
  onCreated: (client: CreatedClient) => void;
}) {
  const [name, setName] = useState(prefillName);
  const [email, setEmail] = useState("");
  const [showAddress, setShowAddress] = useState(false);
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const res = await createClient({ name, email, address, zip, city });
      if (res.ok && res.client) onCreated(res.client);
      else setError(res.error ?? "Une erreur est survenue.");
    });
  }

  const label = "mb-1 block text-sm font-medium";
  const field = "h-10";

  return (
    <Modal open onClose={onClose} title="Nouveau client">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-3"
      >
        <div>
          <label htmlFor="c-name" className={label}>
            Nom <span className="text-destructive">*</span>
          </label>
          <Input id="c-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="c-email" className={label}>
            Email <span className="text-destructive">*</span>
          </label>
          <Input
            id="c-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@exemple.ch"
            className={field}
          />
        </div>

        {showAddress ? (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <div>
              <label htmlFor="c-addr" className={label}>Adresse</label>
              <Input id="c-addr" value={address} onChange={(e) => setAddress(e.target.value)} className={field} />
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-3">
              <div>
                <label htmlFor="c-zip" className={label}>NPA</label>
                <Input id="c-zip" value={zip} onChange={(e) => setZip(e.target.value)} className={field} />
              </div>
              <div>
                <label htmlFor="c-city" className={label}>Ville</label>
                <Input id="c-city" value={city} onChange={(e) => setCity(e.target.value)} className={field} />
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddress(true)}
            className="text-sm text-info transition-colors hover:text-info/80"
          >
            Ajouter l&apos;adresse maintenant
          </button>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <LiquidGlassButton type="submit" disabled={pending} className="h-10 w-full rounded-xl px-4 text-sm">
          {pending && <Loader2 className="size-4 animate-spin" />}
          Créer le client
        </LiquidGlassButton>
      </form>
    </Modal>
  );
}
