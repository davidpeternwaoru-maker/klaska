"use server";

// Expenses — money going out. Owner/Bursar only (Permission Matrix: financial).

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { canManage } from "@/lib/auth/permissions";

export type ActionState = { ok?: boolean; error?: string };

const CATEGORIES = ["SALARIES", "RENT", "UTILITIES", "SUPPLIES", "TRANSPORT", "MAINTENANCE", "OTHER"];

export async function addExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!canManage(user.role, "financial")) return { error: "Only the owner or bursar can record expenses." };

  const category = String(formData.get("category") ?? "OTHER");
  const description = String(formData.get("description") ?? "").trim() || null;
  const amount = Math.round(Number(formData.get("amount")) || 0);
  const spentAt = String(formData.get("spentAt") ?? "").trim();
  if (!CATEGORIES.includes(category)) return { error: "Pick a category." };
  if (amount <= 0) return { error: "Enter an amount greater than zero." };

  await prisma.expense.create({
    data: {
      schoolId: user.schoolId,
      category,
      description,
      amount,
      spentAt: spentAt ? new Date(spentAt) : new Date(),
      recordedBy: user.name,
    },
  });
  revalidatePath("/finance/system");
  return { ok: true };
}

export async function deleteExpense(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!canManage(user.role, "financial")) return;
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.expense.deleteMany({ where: { id, schoolId: user.schoolId } });
  revalidatePath("/finance/system");
}
