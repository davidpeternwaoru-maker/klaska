"use server";

// Server actions for classes. A class has a name (level) and optional arm, and
// can be assigned a form teacher (any staff member in the school).

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";

export type ActionState = { error?: string; ok?: boolean };

export async function createClass(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const arm = String(formData.get("arm") ?? "").trim() || null;
  const teacherId = String(formData.get("teacherId") ?? "").trim() || null;
  if (!name) return { error: "Class name is required (e.g. JSS 1)." };

  if (teacherId) {
    const teacher = await prisma.staff.findFirst({ where: { id: teacherId, schoolId: user.schoolId } });
    if (!teacher) return { error: "Selected teacher was not found." };
  }

  try {
    await prisma.class.create({ data: { schoolId: user.schoolId, name, arm, teacherId } });
  } catch {
    return { error: `Class "${name}${arm ? " " + arm : ""}" already exists.` };
  }
  revalidatePath("/dashboard/classes");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteClass(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  // Students in a deleted class keep their record; their classId is set to null
  // automatically (onDelete: SetNull in the schema).
  if (id) await prisma.class.deleteMany({ where: { id, schoolId: user.schoolId } });
  revalidatePath("/dashboard/classes");
  revalidatePath("/dashboard");
}
