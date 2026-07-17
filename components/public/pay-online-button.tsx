"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";

import { createInvoiceCheckout } from "@/app/actions/payments";

// Public "Payer en ligne" button → Stripe Checkout (destination charge onto the
// owner's connected account). Only rendered when online payment is available.
export function PayOnlineButton({ token, amountLabel }: { token: string; amountLabel: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setError(null);
    setLoading(true);
    const res = await createInvoiceCheckout(token);
    if (res.ok && res.url) {
      window.location.href = res.url;
    } else {
      setError(res.error ?? "Paiement indisponible pour le moment.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={pay}
        disabled={loading}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-70"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
        Payer en ligne — {amountLabel}
      </button>
      {error && <p className="mt-2 text-center text-xs text-red-600">{error}</p>}
      <p className="mt-2 text-center text-xs text-neutral-400">Paiement sécurisé par Stripe</p>
    </div>
  );
}
