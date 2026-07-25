"use server";

// Teaching-duties Server Actions — form teacher + subject assignments. Every one
// delegates to teachingService, which enforces OWNER/HOS access server-side.

import { revalidatePath } from "next/cache";
import { requireCtx, ServiceError } from "@/server/context";
import { teachingService, type TeacherTeaching } from "@/server/services/teaching";

type Res = { ok: true } | { ok: false; error: string };

async function run(fn: () => Promise<void>): Promise<Res> {
  try {
    await fn();
    revalidatePath("/people/staff");
    return { ok: true };
  } catch (e) {
    if (e instanceof ServiceError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function getTeachingAction(staffId: string): Promise<{ ok: true; data: TeacherTeaching } | { ok: false; error: string }> {
  const ctx = await requireCtx();
  try {
    return { ok: true, data: await teachingService.getForTeacher(ctx, staffId) };
  } catch (e) {
    if (e instanceof ServiceError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function setFormClassAction(staffId: string, classId: string | null): Promise<Res> {
  const ctx = await requireCtx();
  return run(() => teachingService.setFormClass(ctx, staffId, classId));
}

export async function addAssignmentAction(staffId: string, subjectId: string, classId: string): Promise<Res> {
  const ctx = await requireCtx();
  return run(() => teachingService.addAssignment(ctx, staffId, subjectId, classId));
}

export async function removeAssignmentAction(assignmentId: string): Promise<Res> {
  const ctx = await requireCtx();
  return run(() => teachingService.removeAssignment(ctx, assignmentId));
}
