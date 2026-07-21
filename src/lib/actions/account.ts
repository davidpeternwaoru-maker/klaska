"use server";

// Own-account Server Action — self-service password change. Delegates to
// `accountService`.

import { requireCtx, ServiceError } from "@/server/context";
import { accountService } from "@/server/services/account";

export type AccountState = { ok?: boolean; error?: string };

export async function changeOwnPassword(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const ctx = await requireCtx();
  try {
    await accountService.changePassword(ctx, String(formData.get("current") ?? ""), String(formData.get("next") ?? ""), String(formData.get("confirm") ?? ""));
  } catch (e) {
    if (e instanceof ServiceError) return { error: e.message };
    throw e;
  }
  return { ok: true };
}
