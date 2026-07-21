"use server";

// Class Server Actions — parse FormData, delegate to `classesService`, revalidate.

import { revalidatePath } from "next/cache";
import { requireCtx, ServiceError } from "@/server/context";
import { classesService } from "@/server/services/classes";

export type ActionState = { error?: string; ok?: boolean };

function revalidateClasses() {
  revalidatePath("/dashboard/classes");
  revalidatePath("/people/classes");
  revalidatePath("/dashboard");
}

export async function createClass(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireCtx();
  try {
    await classesService.create(ctx, {
      name: String(formData.get("name") ?? ""),
      arm: String(formData.get("arm") ?? ""),
      teacherId: String(formData.get("teacherId") ?? ""),
    });
  } catch (e) {
    if (e instanceof ServiceError) return { error: e.message };
    throw e;
  }
  revalidateClasses();
  return { ok: true };
}

export async function updateClass(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireCtx();
  try {
    await classesService.update(ctx, String(formData.get("id") ?? ""), {
      name: String(formData.get("name") ?? ""),
      arm: String(formData.get("arm") ?? ""),
    });
  } catch (e) {
    if (e instanceof ServiceError) return { error: e.message };
    throw e;
  }
  revalidatePath("/dashboard/classes");
  revalidatePath("/people/classes");
  revalidatePath("/settings");
  revalidatePath("/finance/fees");
  return { ok: true };
}

export async function deleteClass(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await classesService.remove(ctx, String(formData.get("id") ?? ""));
  revalidateClasses();
}
