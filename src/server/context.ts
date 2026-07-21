import "server-only";

// ── The service layer's request context ────────────────────────────────────
// Every service function takes a `Ctx` (who is asking) as its first argument
// and enforces permissions + schoolId tenant-scoping *itself*, so callers —
// Server Components (reads) and Server Actions (writes) — never re-implement
// those rules. This module is the one door into the data layer.

import { requireUser, getCurrentUser } from "@/lib/auth/session";
import { canView, canManage, scopeOf, type Area } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/jwt";

/** Who is making the request. Identical to the session payload. */
export type Ctx = SessionUser; // { staffId, schoolId, role, name, email }

export type Access = "view" | "manage";

/** Raised when a service call isn't allowed or the target doesn't exist.
 *  Callers translate it: actions → `{ error }`, pages → redirect/notFound. */
export class ServiceError extends Error {
  constructor(
    message: string,
    readonly code: "FORBIDDEN" | "NOT_FOUND" | "INVALID" = "FORBIDDEN",
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

/** Resolve the ctx for the current request (redirects to /login if signed out). */
export const requireCtx: () => Promise<Ctx> = requireUser;
/** Resolve the ctx, or null when signed out (no redirect). */
export const optionalCtx: () => Promise<Ctx | null> = getCurrentUser;

/** True if the ctx may view / manage an area of the product. */
export function can(ctx: Ctx, area: Area, access: Access = "view"): boolean {
  return access === "manage" ? canManage(ctx.role, area) : canView(ctx.role, area);
}

/** Assert access to an area; throws ServiceError(FORBIDDEN) otherwise. */
export function requireCan(ctx: Ctx, area: Area, access: Access = "view"): void {
  if (!can(ctx, area, access)) {
    throw new ServiceError(`Your role (${ctx.role}) cannot ${access} ${area}.`, "FORBIDDEN");
  }
}

/** The tenant filter that belongs in every query's `where`. */
export function tenant(ctx: Ctx): { schoolId: string } {
  return { schoolId: ctx.schoolId };
}

/** Teacher scoping: teachers act on their OWN classes only (per the matrix).
 *  Returns a Prisma `where` fragment for class-linked records. */
export function classScopeWhere(ctx: Ctx): { schoolId: string; teacherId?: string } {
  if (ctx.role === "TEACHER") return { schoolId: ctx.schoolId, teacherId: ctx.staffId };
  return { schoolId: ctx.schoolId };
}

export { scopeOf };
export type { Area };

// ── Action result contract ─────────────────────────────────────────────────
// Server Actions that call services wrap them with `runAction` so a
// ServiceError becomes a friendly `{ error }` for the client instead of a crash.
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof ServiceError) return { ok: false, error: e.message };
    throw e; // programmer/infra errors keep bubbling
  }
}
