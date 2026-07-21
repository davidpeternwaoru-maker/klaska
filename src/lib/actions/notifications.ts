"use server";

// Notifications Server Actions — delegate to `notificationsService`, revalidate.

import { revalidatePath } from "next/cache";
import { requireCtx, ServiceError } from "@/server/context";
import { notificationsService } from "@/server/services/notifications";

export type ActionState = { ok?: boolean; error?: string };

export async function sendNotice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireCtx();
  try {
    await notificationsService.sendNotice(ctx, {
      audience: String(formData.get("audience") ?? ""),
      title: String(formData.get("title") ?? ""),
      body: String(formData.get("body") ?? ""),
    });
  } catch (e) {
    if (e instanceof ServiceError) return { error: e.message };
    throw e;
  }
  revalidatePath("/settings/notifications");
  return { ok: true };
}

export async function deleteNotice(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await notificationsService.deleteNotice(ctx, String(formData.get("id") ?? ""));
  revalidatePath("/settings/notifications");
}

export async function saveFeePrefs(data: { feeCollection: string; autoFeeReminders: boolean }): Promise<ActionState> {
  const ctx = await requireCtx();
  try {
    await notificationsService.saveFeePrefs(ctx, data);
  } catch (e) {
    if (e instanceof ServiceError) return { error: e.message };
    throw e;
  }
  revalidatePath("/settings");
  revalidatePath("/settings/notifications");
  revalidatePath("/finance/fees");
  return { ok: true };
}
