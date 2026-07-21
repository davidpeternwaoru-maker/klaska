"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/permissions";
import { promoteClassCore, promoteStudentsCore, runEndOfSessionCore, type PromoResult } from "@/lib/promotions";

const DENY: PromoResult = { error: "Only the owner or principal runs promotions." };

function revalidate() {
  revalidatePath("/people/promotions");
  revalidatePath("/people/students");
  revalidatePath("/insights");
  revalidatePath("/");
}

export async function promoteClassAction(classId: string, mode: "promote" | "repeat"): Promise<PromoResult> {
  const user = await requireUser();
  if (!canManage(user.role, "promotions")) return DENY;
  const res = await promoteClassCore(user.schoolId, classId, mode);
  if (res.ok) revalidate();
  return res;
}

export async function promoteStudentsAction(items: { studentId: string; mode: "promote" | "repeat" }[]): Promise<PromoResult> {
  const user = await requireUser();
  if (!canManage(user.role, "promotions")) return DENY;
  const res = await promoteStudentsCore(user.schoolId, items);
  if (res.ok) revalidate();
  return res;
}

export async function runEndOfSessionAction(modes: Record<string, "promote" | "repeat">): Promise<PromoResult> {
  const user = await requireUser();
  if (!canManage(user.role, "promotions")) return DENY;
  const res = await runEndOfSessionCore(user.schoolId, modes);
  if (res.ok) revalidate();
  return res;
}
