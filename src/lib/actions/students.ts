"use server";

// Student Server Actions — the HTTP edge for the browser. They parse FormData,
// delegate all persistence + permission/tenant rules to `studentsService`
// (the single source of truth), then revalidate the affected pages.

import { revalidatePath } from "next/cache";
import { requireCtx, ServiceError } from "@/server/context";
import { studentsService, type StudentInput, type ImportRow } from "@/server/services/students";

export type ActionState = { error?: string; ok?: boolean };
export type ImportResult = { created: number; classesCreated: string[]; skipped: number; error?: string };
export type { ImportRow };

function readForm(formData: FormData): StudentInput {
  return {
    firstName: String(formData.get("firstName") ?? "").trim(),
    lastName: String(formData.get("lastName") ?? "").trim(),
    gender: String(formData.get("gender") ?? "").trim() || null,
    classId: String(formData.get("classId") ?? "").trim() || null,
    guardianName: String(formData.get("guardianName") ?? "").trim() || null,
    guardianPhone: String(formData.get("guardianPhone") ?? "").trim() || null,
    dob: String(formData.get("dob") ?? "").trim(),
    admissionNo: String(formData.get("admissionNo") ?? "").trim(),
  };
}

function revalidateStudents() {
  revalidatePath("/dashboard/students");
  revalidatePath("/people/students");
  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function createStudent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireCtx();
  try {
    await studentsService.create(ctx, readForm(formData));
  } catch (e) {
    if (e instanceof ServiceError) return { error: e.message };
    throw e;
  }
  revalidateStudents();
  return { ok: true };
}

export async function updateStudent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireCtx();
  try {
    await studentsService.update(ctx, String(formData.get("id") ?? ""), readForm(formData));
  } catch (e) {
    if (e instanceof ServiceError) return { error: e.message };
    throw e;
  }
  revalidateStudents();
  return { ok: true };
}

export async function deleteStudent(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await studentsService.remove(ctx, String(formData.get("id") ?? ""));
  revalidateStudents();
}

export async function importStudents(rows: ImportRow[], createMissingClasses: boolean): Promise<ImportResult> {
  const ctx = await requireCtx();
  try {
    const res = await studentsService.import(ctx, rows, createMissingClasses);
    revalidateStudents();
    return res;
  } catch (e) {
    if (e instanceof ServiceError) return { created: 0, classesCreated: [], skipped: 0, error: e.message };
    throw e;
  }
}
