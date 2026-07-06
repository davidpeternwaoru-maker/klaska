"use server";

// Own-account actions. Any signed-in staff member can change THEIR OWN
// password (after the owner gave them their initial one). Owner-managed
// resets live in Staff management; this is the self-service half.

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export type AccountState = { ok?: boolean; error?: string };

export async function changeOwnPassword(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (next.length < 6) return { error: "New password must be at least 6 characters." };
  if (next !== confirm) return { error: "New passwords don't match." };

  const staff = await prisma.staff.findUnique({ where: { id: user.staffId } });
  if (!staff || staff.schoolId !== user.schoolId) return { error: "Account not found." };
  if (!(await verifyPassword(current, staff.passwordHash))) return { error: "Your current password is incorrect." };

  await prisma.staff.update({ where: { id: staff.id }, data: { passwordHash: await hashPassword(next) } });
  return { ok: true };
}
