import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { EventType } from "@/lib/app/event-types";

// Re-export the pure helpers so server callers can import everything from here.
export {
  TONE_BY_LEVEL,
  TONE_LABEL,
  sendEmailCopy,
  reminderEmailCopy,
} from "@/lib/app/event-types";
export type { EventType, Tone, EmailCopy } from "@/lib/app/event-types";

type Ref = { invoiceId?: string; quoteId?: string };

export async function recordEvent(
  ref: Ref,
  type: EventType,
  payload?: Prisma.InputJsonValue,
): Promise<void> {
  await prisma.documentEvent.create({
    data: {
      invoiceId: ref.invoiceId ?? null,
      quoteId: ref.quoteId ?? null,
      type,
      payload: payload ?? undefined,
    },
  });
}

// Record a public-page view at most once per calendar day per document.
export async function recordViewOncePerDay(ref: Ref): Promise<void> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const where = {
    ...(ref.invoiceId ? { invoiceId: ref.invoiceId } : { quoteId: ref.quoteId }),
    type: "VIEWED",
    createdAt: { gte: start },
  };
  const existing = await prisma.documentEvent.findFirst({ where });
  if (existing) return;
  await recordEvent(ref, "VIEWED");
}
