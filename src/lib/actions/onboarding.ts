"use server";

// Setup-wizard / settings Server Actions — parse input, delegate to
// `setupService`, revalidate. completeSetup redirects into the polished app.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCtx, ServiceError } from "@/server/context";
import { setupService, type ClassLite } from "@/server/services/setup";

export type SetupState = { ok?: boolean; error?: string };
export type { ClassLite };

async function run(fn: () => Promise<void>, paths: string[]): Promise<SetupState> {
  try {
    await fn();
    paths.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    if (e instanceof ServiceError) return { error: e.message };
    throw e;
  }
}

export async function saveProfile(data: {
  name: string;
  shortName?: string;
  motto?: string;
  address?: string;
  email?: string;
  phone?: string;
  logoUrl?: string | null;
}): Promise<SetupState> {
  const ctx = await requireCtx();
  return run(() => setupService.saveProfile(ctx, data), ["/onboarding", "/dashboard"]);
}

export async function saveSections(sections: string[]): Promise<SetupState> {
  const ctx = await requireCtx();
  return run(() => setupService.saveSections(ctx, sections), ["/onboarding"]);
}

export async function createClassesBulk(items: { name: string; arms: string[] }[]): Promise<SetupState & { classes: ClassLite[] }> {
  const ctx = await requireCtx();
  try {
    const classes = await setupService.createClassesBulk(ctx, items);
    revalidatePath("/onboarding");
    revalidatePath("/dashboard/classes");
    revalidatePath("/people/classes");
    return { ok: true, classes };
  } catch (e) {
    if (e instanceof ServiceError) return { error: e.message, classes: [] };
    throw e;
  }
}

export async function saveGrading(
  category: string,
  bands: { label: string; minScore: number; maxScore: number; remark: string }[],
): Promise<SetupState> {
  const ctx = await requireCtx();
  return run(() => setupService.saveGrading(ctx, category, bands), ["/onboarding"]);
}

export async function saveFeeStructure(
  items: { name: string; mandatory: boolean }[],
  cells: { itemName: string; classId: string; amount: number }[],
): Promise<SetupState> {
  const ctx = await requireCtx();
  return run(() => setupService.saveFeeStructure(ctx, items, cells), ["/onboarding", "/dashboard/settings", "/settings", "/finance/fees"]);
}

export async function saveTermInfo(data: { session: string; term: string; termStart?: string; termEnd?: string }): Promise<SetupState> {
  const ctx = await requireCtx();
  return run(() => setupService.saveTermInfo(ctx, data), ["/", "/dashboard/settings", "/settings", "/finance/fees"]);
}

export async function completeSetup(): Promise<void> {
  const ctx = await requireCtx();
  await setupService.completeSetup(ctx);
  revalidatePath("/");
  redirect("/"); // the full, polished app
}
