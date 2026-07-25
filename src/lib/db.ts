// The Prisma client = your type-safe gateway to Postgres. You call things like
// `prisma.student.create({ ... })` and Prisma turns it into real SQL.
//
// In development Next.js hot-reloads constantly, which would otherwise spawn a
// new database connection on every reload until the pool is exhausted. The
// pattern below caches one client on `globalThis` so we reuse a single
// connection across reloads. In production a fresh client is created once.

import { PrismaClient } from "@prisma/client";
import { env, isProd } from "@/env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (!isProd) globalForPrisma.prisma = prisma;
