"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { ClientCreateModal } from "@/components/app/client-create-modal";
import { useToast } from "@/components/ui/toast";
import { LiquidGlassButton } from "@/components/ui/liquid-glass";

export function NewClientButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  return (
    <>
      <LiquidGlassButton onClick={() => setOpen(true)} className="h-10 rounded-xl px-4 text-sm">
        <Plus className="size-4" />
        Nouveau client
      </LiquidGlassButton>
      {open && (
        <ClientCreateModal
          prefillName=""
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            toast("Client ajouté ✓");
            router.refresh();
          }}
        />
      )}
    </>
  );
}
