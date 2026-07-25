"use server";

// Appraisals Server Actions — delegate to the service (writes) and the read layer
// (single-teacher fetch), each of which enforces the access rules server-side.

import { revalidatePath } from "next/cache";
import { requireCtx, ServiceError } from "@/server/context";
import { appraisalsService, type SectionInput } from "@/server/services/appraisals";
import { getTeacherAppraisal } from "@/lib/appraisals";
import type { Appraisal, RaterId } from "@/lib/appraisals/config";

type Res = { ok?: true; error?: string };

export async function saveRatingAction(staffId: string, rater: RaterId, sections: SectionInput[], overallComment: string, submit: boolean): Promise<Res> {
  const ctx = await requireCtx();
  try {
    await appraisalsService.saveRating(ctx, staffId, rater, sections, overallComment, submit);
    revalidatePath("/people/appraisals");
    return { ok: true };
  } catch (e) {
    if (e instanceof ServiceError) return { error: e.message };
    throw e;
  }
}

/** Fetch one teacher's full appraisal — visibility enforced in the read layer, so
 *  a Teacher calling this for anyone else gets `{ error }`, not their record. */
export async function getAppraisalAction(staffId: string): Promise<{ ok: true; appraisal: Appraisal } | { ok: false; error: string }> {
  const ctx = await requireCtx();
  try {
    const { appraisal } = await getTeacherAppraisal(ctx, staffId);
    return { ok: true, appraisal };
  } catch (e) {
    if (e instanceof ServiceError) return { ok: false, error: e.message };
    throw e;
  }
}
