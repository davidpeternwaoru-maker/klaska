"use server";

// Server actions for staff. Adding a staff member also creates their login
// (email + an initial password the owner sets), so they can sign in right away.
// Only the OWNER or BURSAR may manage staff.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import type { Role } from "@/lib/auth/jwt";

export type ActionState = { error?: string; ok?: boolean };

const ROLES: Role[] = ["OWNER", "BURSAR", "TEACHER"];

export async function createStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (user.role === "TEACHER") return { error: "Only an owner or bursar can add staff." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const title = String(formData.get("title") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const password = String(formData.get("password") ?? "");
  const roleRaw = String(formData.get("role") ?? "TEACHER");
  const role: Role = ROLES.includes(roleRaw as Role) ? (roleRaw as Role) : "TEACHER";

  if (!name || !email) return { error: "Name and email are required." };
  if (password.length < 6) return { error: "Initial password must be at least 6 characters." };

  const existing = await prisma.staff.findUnique({ where: { email } });
  if (existing) return { error: "A staff member with that email already exists." };

  await prisma.staff.create({
    data: { schoolId: user.schoolId, name, email, title, phone, role, passwordHash: await hashPassword(password) },
  });
  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteStaff(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (user.role === "TEACHER") return;
  const id = String(formData.get("id") ?? "");
  // Never let someone delete their own account (would lock them out).
  if (id && id !== user.staffId) await prisma.staff.deleteMany({ where: { id, schoolId: user.schoolId } });
  revalidatePath("/dashboard/staff");
}
