"use server";

// Report-card Server Action — the form teacher writes a student's overall
// class-teacher remark. Access is enforced in reportCardsService.

import { revalidatePath } from "next/cache";
import { requireCtx, ServiceError } from "@/server/context";
import { reportCardsService } from "@/server/services/reportcards";

export async function saveClassRemarkAction(studentId: string, remark: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireCtx();
  try {
    await reportCardsService.saveClassRemark(ctx, studentId, remark);
    revalidatePath("/academics/report-cards");
    return { ok: true };
  } catch (e) {
    if (e instanceof ServiceError) return { ok: false, error: e.message };
    throw e;
  }
}
