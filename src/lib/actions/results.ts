"use server";

// Subjects + results Server Actions — parse input, delegate to `resultsService`
// (which computes totals/grades server-side), revalidate.

import { revalidatePath } from "next/cache";
import { requireCtx, ServiceError } from "@/server/context";
import { resultsService } from "@/server/services/results";
import type { SaveResultsResult } from "@/lib/results";

export type ActionState = { error?: string; ok?: boolean };

export async function createSubject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireCtx();
  try {
    await resultsService.createSubject(ctx, { name: String(formData.get("name") ?? ""), code: String(formData.get("code") ?? "") });
  } catch (e) {
    if (e instanceof ServiceError) return { error: e.message };
    throw e;
  }
  revalidatePath("/dashboard/subjects");
  revalidatePath("/dashboard/results");
  revalidatePath("/academics/results");
  return { ok: true };
}

export async function createSubjectsBulk(names: string[]): Promise<ActionState> {
  const ctx = await requireCtx();
  await resultsService.createSubjectsBulk(ctx, names);
  revalidatePath("/dashboard/subjects");
  revalidatePath("/academics/results");
  return { ok: true };
}

export async function deleteSubject(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await resultsService.deleteSubject(ctx, String(formData.get("id") ?? ""));
  revalidatePath("/dashboard/subjects");
  revalidatePath("/dashboard/results");
  revalidatePath("/academics/results");
}

export async function saveResults(
  subjectId: string,
  classId: string,
  entries: { studentId: string; ca1?: unknown; ca2?: unknown; exam?: unknown; subjectRemark?: unknown }[],
): Promise<SaveResultsResult> {
  const ctx = await requireCtx();
  try {
    const saved = await resultsService.save(ctx, subjectId, classId, entries);
    revalidatePath("/dashboard/results");
    revalidatePath("/academics/results");
    return { ok: true, saved };
  } catch (e) {
    if (e instanceof ServiceError) return { error: e.message };
    throw e;
  }
}
