"use server";

// Organisation Server Actions — delegate to `orgService`, revalidate.

import { revalidatePath } from "next/cache";
import { requireCtx, ServiceError } from "@/server/context";
import { orgService } from "@/server/services/org";

export type OrgState = { ok?: boolean; error?: string };

function refresh() {
  revalidatePath("/settings");
  revalidatePath("/academics/ai");
  revalidatePath("/");
}

async function run(fn: () => Promise<void>): Promise<OrgState> {
  try {
    await fn();
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof ServiceError) return { error: e.message };
    throw e;
  }
}

export async function setTier(tier: string): Promise<OrgState> {
  const ctx = await requireCtx();
  return run(() => orgService.setTier(ctx, tier));
}

export async function toggleMultiCampus(on: boolean): Promise<OrgState> {
  const ctx = await requireCtx();
  return run(() => orgService.toggleMultiCampus(ctx, on));
}

export async function createCampus(_prev: OrgState, formData: FormData): Promise<OrgState> {
  const ctx = await requireCtx();
  return run(() => orgService.createCampus(ctx, String(formData.get("name") ?? "")));
}

export async function deleteCampus(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  await orgService.deleteCampus(ctx, String(formData.get("id") ?? ""));
  refresh();
}

export async function assignClassCampus(classId: string, campusId: string | null): Promise<OrgState> {
  const ctx = await requireCtx();
  const res = await run(() => orgService.assignClassCampus(ctx, classId, campusId));
  revalidatePath("/people/classes");
  return res;
}
