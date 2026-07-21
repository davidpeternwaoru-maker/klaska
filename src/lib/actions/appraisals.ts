"use server";

// Appraisals Server Actions — delegate to `appraisalsService`, revalidate.

import { revalidatePath } from "next/cache";
import { requireCtx, ServiceError } from "@/server/context";
import { appraisalsService } from "@/server/services/appraisals";
import type { RaterId } from "@/lib/appraisals/config";

type Res = { ok?: true; error?: string };

async function run(fn: () => Promise<void>): Promise<Res> {
  try {
    await fn();
    revalidatePath("/people/appraisals");
    return { ok: true };
  } catch (e) {
    if (e instanceof ServiceError) return { error: e.message };
    throw e;
  }
}

export async function saveRatingAction(staffId: string, rater: RaterId, ratings: Record<string, number>, comment: string): Promise<Res> {
  const ctx = await requireCtx();
  return run(() => appraisalsService.saveRating(ctx, staffId, rater, ratings, comment));
}

export async function signOffAction(staffId: string, byName: string): Promise<Res> {
  const ctx = await requireCtx();
  return run(() => appraisalsService.signOff(ctx, staffId, byName));
}

export async function reopenAction(staffId: string): Promise<Res> {
  const ctx = await requireCtx();
  return run(() => appraisalsService.reopen(ctx, staffId));
}
