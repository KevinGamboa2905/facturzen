// Database seed — run with `npm run db:seed` (locally) or, once, against prod:
//   DATABASE_URL="<url prod>" npm run db:seed
//
// Seeds the canonical "Léa Morand / Studio Morand" demo workspace so a fresh
// Postgres has something to look at (dashboard stats, quotes, invoices,
// reminders, a service catalogue + one pack). Idempotent: re-running replaces
// the seeded account, never duplicates it.
//
// The live /demo experience does NOT depend on this seed — each anonymous
// visitor gets their own ephemeral sandbox minted on the fly. This is the same
// data, materialized once as a persistent example.
import { PrismaClient } from "@prisma/client";

import { createDemoWorkspace } from "../lib/demo/create";

// Fixed token so the seed is idempotent (persistent, never expires).
const SEED_TOKEN = "seed-lea";
const SEED_EMAIL = "lea.morand@studio-morand.demo";

const prisma = new PrismaClient();

async function main() {
  // Idempotency: drop any previously seeded account (cascades to its data).
  const existing = await prisma.user.findUnique({ where: { demoToken: SEED_TOKEN } });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
    console.log("↻ Removed previous seed account.");
  }

  const user = await createDemoWorkspace(prisma, {
    token: SEED_TOKEN,
    email: SEED_EMAIL,
    ttlDays: null, // persistent — this is a demo showcase, not a 24h sandbox
  });

  const [clients, services, quotes, invoices] = await Promise.all([
    prisma.client.count({ where: { userId: user.id } }),
    prisma.service.count({ where: { userId: user.id } }),
    prisma.quote.count({ where: { userId: user.id } }),
    prisma.invoice.count({ where: { userId: user.id } }),
  ]);

  console.log("✅ Seed terminé — compte démo « Léa Morand » :");
  console.log(`   ${clients} clients · ${services} prestations · ${quotes} devis · ${invoices} factures`);
}

main()
  .catch((e) => {
    console.error("❌ Seed échoué :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
