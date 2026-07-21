"use server";

// Expenses Server Actions — money going out. Delegate to `financeService`.

import { revalidatePath } from "next/cache";
import { requireCtx, ServiceError } from "@/server/context";
import { financeService } from "@/server/services/finance";

export type ActionState = { ok?: boolean; error?: string };

export async function addExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireCtx();
  try {
    await financeService.addExpense(ctx, {
      category: String(formData.get("category") ?? "OTHER"),
      description: String(formData.get("description") ?? ""),
      amount: Number(formData.get("amount")),
      spentAt: String(formData.get("spentAt") ?? ""),
    });
  } catch (e) {
    if (e instanceof ServiceError) return { error: e.message };
    throw e;
  }
  revalidatePath("/finance/system");
  return { ok: true };
}

export async function deleteExpense(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await financeService.deleteExpense(ctx, String(formData.get("id") ?? ""));
  revalidatePath("/finance/system");
}
