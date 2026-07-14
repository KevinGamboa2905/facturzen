"use client";

import { useState, useTransition } from "react";
import {
  Ban,
  BellRing,
  CheckCircle2,
  Clock,
  Eye,
  FilePlus2,
  Mail,
  RefreshCw,
  Wallet,
} from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { TONE_LABEL, type Tone } from "@/lib/app/event-types";
import { disableReminder } from "@/app/actions/documents";

export type TimelineEvent = {
  id: string;
  type: string;
  payload: { subject?: string; body?: string; level?: number; tone?: Tone; invoiceNumber?: string } | null;
  createdAt: string;
};

export type ScheduledReminder = { id: string; level: number; tone: string; scheduledAt: string };

const dtf = new Intl.DateTimeFormat("fr-CH", { day: "numeric", month: "long", year: "numeric" });

function labelFor(e: TimelineEvent): string {
  switch (e.type) {
    case "CREATED":
      return "Document créé";
    case "SENT":
      return "Envoyé au client";
    case "VIEWED":
      return "Vu par le client";
    case "REMINDER_SENT": {
      const tone = e.payload?.tone ? TONE_LABEL[e.payload.tone] : "";
      return `Relance ${e.payload?.level ?? ""} envoyée${tone ? ` (${tone})` : ""}`;
    }
    case "DEPOSIT_PAID":
      return "Acompte encaissé";
    case "PAID":
      return "Payée";
    case "CONVERTED":
      return `Convertie${e.payload?.invoiceNumber ? ` en ${e.payload.invoiceNumber}` : ""}`;
    case "BALANCE_INVOICED":
      return "Solde facturé";
    case "CANCELLED":
      return "Annulée";
    default:
      return e.type;
  }
}

function iconFor(type: string) {
  switch (type) {
    case "CREATED":
      return FilePlus2;
    case "SENT":
      return Mail;
    case "VIEWED":
      return Eye;
    case "REMINDER_SENT":
      return BellRing;
    case "DEPOSIT_PAID":
      return Wallet;
    case "PAID":
      return CheckCircle2;
    case "CONVERTED":
      return RefreshCw;
    case "CANCELLED":
      return Ban;
    default:
      return Clock;
  }
}

// Vertical event timeline (§2), newest first. Sent/reminder rows open the exact
// email that was expedited. Scheduled reminders show dotted, with "désactiver".
export function DocumentTimeline({
  events,
  scheduled,
}: {
  events: TimelineEvent[];
  scheduled: ScheduledReminder[];
}) {
  const [preview, setPreview] = useState<TimelineEvent | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [, start] = useTransition();

  const upcoming = scheduled.filter((s) => !hidden.has(s.id));

  return (
    <div>
      <h2 className="text-sm font-medium">Historique</h2>
      <ol className="mt-4 space-y-0">
        {/* Scheduled (future) reminders, dotted */}
        {upcoming.map((s) => (
          <li key={s.id} className="relative flex gap-3 pb-5">
            <span className="absolute left-[11px] top-6 h-full w-px border-l border-dashed border-border" />
            <span className="z-10 grid size-6 shrink-0 place-items-center rounded-full border border-dashed border-border bg-background text-muted-foreground">
              <Clock className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">
                Relance {s.level} prévue le {dtf.format(new Date(s.scheduledAt))}
                {TONE_LABEL[s.tone as Tone] ? ` (${TONE_LABEL[s.tone as Tone]})` : ""}
              </p>
              <button
                type="button"
                onClick={() =>
                  start(async () => {
                    setHidden((prev) => new Set(prev).add(s.id));
                    await disableReminder(s.id);
                  })
                }
                className="mt-0.5 text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
              >
                désactiver
              </button>
            </div>
          </li>
        ))}

        {/* Past events, newest first */}
        {events.map((e, i) => {
          const Icon = iconFor(e.type);
          const clickable = e.type === "SENT" || e.type === "REMINDER_SENT";
          const last = i === events.length - 1;
          return (
            <li key={e.id} className="relative flex gap-3 pb-5">
              {!last && <span className="absolute left-[11px] top-6 h-full w-px bg-border" />}
              <span className="z-10 grid size-6 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground">
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{labelFor(e)}</p>
                <p className="text-xs text-muted-foreground">{dtf.format(new Date(e.createdAt))}</p>
                {clickable && e.payload?.subject && (
                  <button
                    type="button"
                    onClick={() => setPreview(e)}
                    className="mt-1 text-xs text-info transition-colors hover:text-info/80"
                  >
                    Voir l&apos;email envoyé
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {preview && (
        <Modal open onClose={() => setPreview(null)} title="Email envoyé">
          <p className="text-xs text-muted-foreground">Objet</p>
          <p className="mt-1 text-sm font-medium">{preview.payload?.subject}</p>
          <p className="mt-4 text-xs text-muted-foreground">Message</p>
          <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground">
            {preview.payload?.body}
          </pre>
        </Modal>
      )}
    </div>
  );
}
