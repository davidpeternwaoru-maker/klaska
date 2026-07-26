// The Prisma client = your type-safe gateway to Postgres. You call things like
// `prisma.student.create({ ... })` and Prisma turns it into real SQL.
//
// In development Next.js hot-reloads constantly, which would otherwise spawn a
// new database connection on every reload until the pool is exhausted. The
// pattern below caches one client on `globalThis` so we reuse a single
// connection across reloads. In production a fresh client is created once.

import { PrismaClient, Prisma } from "@prisma/client";
import { env, isProd } from "@/env";
import { currentTenant, isTenantBypassed } from "@/server/tenant";

// Models that carry a `schoolId` column — i.e. tenant-owned data. Derived from
// the schema so it can never drift out of date. (School itself is the tenant
// root and has no schoolId; child tables like AppraisalScore are reached only
// through a tenant-owned parent.)
const TENANT_MODELS = new Set(
  Prisma.dmmf.datamodel.models.filter((m) => m.fields.some((f) => f.name === "schoolId")).map((m) => m.name),
);
// Operations whose `where` we scope to the tenant. Prisma's extended
// whereUnique lets us add `schoolId` alongside a unique key, so findUnique /
// update / delete are covered too.
const WHERE_OPS = new Set(["findFirst", "findFirstOrThrow", "findMany", "findUnique", "findUniqueOrThrow", "count", "aggregate", "groupBy", "updateMany", "deleteMany", "update", "delete"]);

function makeClient() {
  const base = new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Non-tenant model or explicit bypass → run as-is (cheap sync checks first).
          if (!model || !TENANT_MODELS.has(model) || isTenantBypassed()) return query(args);
          // Pre-auth (login/signup) or off-request → no tenant, run as-is.
          const tenant = await currentTenant();
          if (!tenant) return query(args);
          const a = (args ?? {}) as Record<string, unknown>;

          // Scope reads/updates/deletes by schoolId (only if not already set —
          // respect any explicit filter the service provided).
          if (WHERE_OPS.has(operation)) {
            const where = (a.where ?? {}) as Record<string, unknown>;
            if (where.schoolId === undefined) a.where = { ...where, schoolId: tenant };
          }

          // Stamp the tenant onto new rows (unless the caller set it, or is
          // creating via a `school` relation connect).
          const stamp = (d: Record<string, unknown> | undefined) =>
            d && d.schoolId === undefined && d.school === undefined ? { ...d, schoolId: tenant } : d;
          if (operation === "create") {
            a.data = stamp(a.data as Record<string, unknown>);
          } else if (operation === "createMany") {
            if (Array.isArray(a.data)) a.data = a.data.map((d) => stamp(d as Record<string, unknown>));
            else a.data = stamp(a.data as Record<string, unknown>);
          } else if (operation === "upsert") {
            const where = (a.where ?? {}) as Record<string, unknown>;
            if (where.schoolId === undefined) a.where = { ...where, schoolId: tenant };
            a.create = stamp(a.create as Record<string, unknown>);
          }
          return query(a);
        },
      },
    },
  });
}

type Client = ReturnType<typeof makeClient>;
const globalForPrisma = globalThis as unknown as { prisma?: Client };

export const prisma = globalForPrisma.prisma ?? makeClient();

if (!isProd) globalForPrisma.prisma = prisma;
