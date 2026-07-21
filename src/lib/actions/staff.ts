"use server";

// Staff Server Actions — parse FormData, delegate to `staffService`, revalidate.

import { revalidatePath } from "next/cache";
import { requireCtx, ServiceError } from "@/server/context";
import { staffService } from "@/server/services/staff";

export type ActionState = { error?: string; ok?: boolean };

function revalidateStaff() {
  revalidatePath("/dashboard/staff");
  revalidatePath("/people/staff");
  revalidatePath("/dashboard");
}

export async function createStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireCtx();
  try {
    await staffService.create(ctx, {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      title: String(formData.get("title") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      password: String(formData.get("password") ?? ""),
      role: String(formData.get("role") ?? "TEACHER"),
    });
  } catch (e) {
    if (e instanceof ServiceError) return { error: e.message };
    throw e;
  }
  revalidateStaff();
  return { ok: true };
}

export async function deleteStaff(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await staffService.remove(ctx, String(formData.get("id") ?? ""));
  revalidatePath("/dashboard/staff");
  revalidatePath("/people/staff");
}

export async function resetStaffPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireCtx();
  try {
    await staffService.resetPassword(ctx, String(formData.get("id") ?? ""), String(formData.get("password") ?? ""));
  } catch (e) {
    if (e instanceof ServiceError) return { error: e.message };
    throw e;
  }
  revalidatePath("/dashboard/staff");
  revalidatePath("/people/staff");
  return { ok: true };
}
