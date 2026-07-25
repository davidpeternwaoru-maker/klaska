import "server-only";

// ── The service layer's request context ────────────────────────────────────
// Every service function takes a `Ctx` (who is asking) as its first argument
// and enforces permissions + schoolId tenant-scoping *itself*, so callers —
// Server Components (reads) and Server Actions (writes) — never re-implement
// those rules. This module is the one door into the data layer.

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
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

/** Page guard: require login AND matrix access to an area, else redirect home.
 *  Use at the top of a protected page instead of hand-rolling canView + redirect.
 *  (The edge middleware enforces the same rule; this is defence-in-depth.) */
export async function requireAccess(area: Area, access: Access = "view"): Promise<Ctx> {
  const ctx = await requireCtx();
  if (!can(ctx, area, access)) redirect("/");
  return ctx;
}

/** The tenant filter that belongs in every query's `where`. */
export function tenant(ctx: Ctx): { schoolId: string } {
  return { schoolId: ctx.schoolId };
}

/** Teacher scoping (legacy, FORM-teacher only): teachers act on classes they own.
 *  Prefer `teacherClassWhere` for surfaces where a teacher's TAUGHT classes also
 *  count (attendance, students, results). Kept for callers that specifically mean
 *  "the class this teacher owns". */
export function classScopeWhere(ctx: Ctx): { schoolId: string; teacherId?: string } {
  if (ctx.role === "TEACHER") return { schoolId: ctx.schoolId, teacherId: ctx.staffId };
  return { schoolId: ctx.schoolId };
}

/** The class IDs a teacher may reach: the class they OWN (form teacher) UNION the
 *  classes they TEACH a subject in (assignments). Non-teachers get null (= no
 *  class-id restriction — the schoolId tenant filter still applies). */
export async function teacherClassIds(ctx: Ctx): Promise<string[] | null> {
  if (ctx.role !== "TEACHER") return null;
  const [owned, assigned] = await Promise.all([
    prisma.class.findMany({ where: { schoolId: ctx.schoolId, teacherId: ctx.staffId }, select: { id: true } }),
    prisma.teachingAssignment.findMany({ where: { schoolId: ctx.schoolId, teacherId: ctx.staffId }, select: { classId: true } }),
  ]);
  return Array.from(new Set([...owned.map((c) => c.id), ...assigned.map((a) => a.classId)]));
}

/** A Prisma `where` on Class (by id) scoped to a teacher's owned ∪ taught classes.
 *  For non-teachers it's just the tenant filter. Teachers with no classes get an
 *  impossible filter (fail-closed: they see nothing). */
export async function teacherClassWhere(ctx: Ctx): Promise<{ schoolId: string; id?: { in: string[] } }> {
  const ids = await teacherClassIds(ctx);
  if (ids === null) return { schoolId: ctx.schoolId };
  return { schoolId: ctx.schoolId, id: { in: ids } };
}

/** True if the teacher may act in `classId` (owns it OR teaches a subject in it).
 *  Non-teachers (with area access) always pass. */
export async function teacherCanAccessClass(ctx: Ctx, classId: string): Promise<boolean> {
  if (ctx.role !== "TEACHER") return true;
  const ids = await teacherClassIds(ctx);
  return !!ids && ids.includes(classId);
}

/** True if the teacher is assigned to teach `subjectId` in `classId`. */
export async function teacherTeachesSubjectInClass(ctx: Ctx, subjectId: string, classId: string): Promise<boolean> {
  const a = await prisma.teachingAssignment.findFirst({ where: { schoolId: ctx.schoolId, teacherId: ctx.staffId, subjectId, classId }, select: { id: true } });
  return !!a;
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
