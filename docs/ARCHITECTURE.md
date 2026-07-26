# Klaska backend — architecture & maintenance guide

For the founders maintaining this codebase. Read this before making backend
changes. Companion: `SECURITY.md`, `BACKUP.md`, `OFFLINE.md`.

---

## The stack

- **Next.js (App Router)** — one codebase serves the web app (Server Components +
  Server Actions) and a versioned HTTP API (`/api/v1/*`) for mobile/native.
- **TypeScript**, strict.
- **Prisma** ORM → **Neon Postgres** (pooled connection for the app, direct
  connection for migrations).
- **Zod** for input validation. **jose** for JWTs, **bcryptjs** for passwords.
- Host-agnostic: `output: "standalone"` builds a plain Node server (any host /
  Docker). No Vercel-specific APIs.

## The layers (data flows top → bottom, never sideways)

```
Web:    Page / Server Action ─┐
Mobile: /api/v1 route handler ─┤→  Service (business logic + RBAC + tenant)  →  Prisma  →  Postgres
                               │        (src/server/services/*)
Validation (Zod) at the entry ─┘
```

**Rules of the codebase:**
1. **No DB access outside a service.** `prisma.*` is only ever called inside
   `src/server/services/*` (and the `src/server/*` infra). Pages, components,
   actions, and API routes call services — never Prisma directly.
2. **Every service method takes `ctx` first** (the caller's identity) and
   enforces permissions itself via `@/server/context` helpers. Callers never
   re-implement auth.
3. **Validate untrusted input at the boundary** with a Zod schema
   (`src/lib/schemas.ts`) before it reaches a service.
4. **The web and the API share the same services** — there is one source of
   truth for business logic and access control.

## Key directories

| Path | What lives here |
|---|---|
| `src/server/services/*` | **All business logic + data access.** One file per domain (students, finance, results, attendance, teaching, appraisals, audit, …). |
| `src/server/context.ts` | The request `Ctx`, permission asserts (`requireCan`, `requireAccess`), tenant/teacher scoping helpers. |
| `src/server/tenant.ts` | Per-request tenant (schoolId) used by the data-layer isolation. |
| `src/server/ratelimit.ts` | DB-backed rate limiting. |
| `src/lib/db.ts` | The Prisma client **+ the tenant-isolation extension**. |
| `src/lib/auth/*` | JWT (`jwt.ts`), cookie session (`session.ts`), password hashing, login/logout actions, the permission matrix (`permissions.ts`). |
| `src/lib/schemas.ts`, `validation.ts` | Zod schemas + parse helpers. |
| `src/lib/api.ts` | API envelope, error mapper, `requireApiUser`, `apiRateLimit`. |
| `src/lib/actions/*` | Thin Server Actions that call services + revalidate. |
| `src/app/api/v1/*` | Versioned HTTP API route handlers. |
| `src/app/**` | Pages (Server Components) + error/not-found boundaries. |
| `src/env.ts` | Zod-validated environment config (fail-fast at boot). |
| `src/lib/logger.ts` | Structured logging + `captureError`. |
| `prisma/schema.prisma`, `prisma/migrations/*` | Schema + versioned migrations. |

## The permission model

`src/lib/auth/permissions.ts` holds the **matrix**: for each area
(students, results, fees, financial, appraisals, …) and each role
(OWNER, HOS, BURSAR, HOD, TEACHER, ADMIN) it says full / view / dept / own /
none. Everything flows from here:
- Middleware (`src/middleware.ts`) does a fast, edge-side gate on the token.
- Pages call `requireAccess(area)`; services call `requireCan(ctx, area)` — this
  is the authoritative, server-side enforcement.
- Scoped roles are handled by helpers: teachers → owned ∪ taught classes
  (`teacherClassWhere`), HODs → their department.

## Multi-tenancy (how one school can't see another)

Two layers:
1. **Explicit**: services filter by `schoolId: ctx.schoolId`.
2. **Structural** (defence-in-depth): the Prisma extension in `db.ts` reads the
   current tenant (`src/server/tenant.ts`, from the session cookie) and
   auto-injects `schoolId` into every query on a tenant-owned table. A query
   that forgets the filter still can't cross schools. `bypassTenant()` is the
   only escape hatch.

## How to add a feature (the recipe)

1. **Schema**: edit `prisma/schema.prisma`; create a migration
   (`npx prisma migrate dev --name <thing>`), which also regenerates the client.
   Index every column you'll filter/join on.
2. **Service**: add a method in the right `src/server/services/*.ts`. Take `ctx`
   first; call `requireCan(ctx, area, "manage"|"view")`; keep tenant scoping.
3. **Validation**: add a Zod schema in `src/lib/schemas.ts`.
4. **Entry point**: a Server Action (`src/lib/actions/*`) for the web, and/or an
   `/api/v1/*` route for mobile — both parse with the schema, then call the
   service. Never put logic in the entry point.
5. **UI**: a Server Component page reads via the service; client components call
   the action.
6. **Verify**: `npx tsc --noEmit`, then exercise it per role.

## Running & operating

- Dev: `npm run dev` → http://localhost:3000. Health: `/api/v1/health`.
- Env: copy `.env.example` → `.env`. `src/env.ts` fails fast if anything's
  missing. Each environment (dev/staging/prod) supplies its own values.
- Migrations: `npx prisma migrate deploy` (prod). Never edit the DB by hand.
- Deploy is host-agnostic; the app expects the DB to be migrated first
  (`next build` does not auto-migrate).
- Backups/restore: `docs/BACKUP.md`.

## Gotchas / conventions

- Underscore-prefixed folders under `src/app/**` are **private** (Next won't
  route them) — don't name a route folder `_x`.
- Server-only modules import `"server-only"`; never import them into client
  components (types are fine via `import type`).
- The standalone RBAC verifier scripts crash on exit under Node 24 on Windows
  (a Prisma teardown quirk) — verify with fetch-only checks against the running
  dev server instead.
