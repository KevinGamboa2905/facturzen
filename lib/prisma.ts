import { PrismaClient } from "@prisma/client";

import { isDevelopment, isProduction } from "@/lib/env";

// Reuse a single PrismaClient across hot reloads in dev to avoid exhausting
// database connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDevelopment ? ["error", "warn"] : ["error"],
  });

if (!isProduction) globalForPrisma.prisma = prisma;
