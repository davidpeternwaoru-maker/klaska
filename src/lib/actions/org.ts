"use server";

// Organisation-level controls: plan tier + multi-campus structure.
// Owner only — this is the "Settings & billing: Owner Full" row of the matrix.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";

export type OrgState = { ok?: boolean; error?: string };

function refresh() {
  revalidatePath("/settings");
  revalidatePath("/academics/ai");
  revalidatePath("/");
}

export async function setTier(tier: string): Promise<OrgState> {
  const user = await requireUser();
  if (user.role !== "OWNER") return { error: "Only the owner changes the plan." };
  if (!["BASIC", "ENTERPRISE"].includes(tier)) return { error: "Unknown plan." };
  await prisma.school.update({ where: { id: user.schoolId }, data: { tier } });
  refresh();
  return { ok: true };
}

export async function toggleMultiCampus(on: boolean): Promise<OrgState> {
  const user = await requireUser();
  if (user.role !== "OWNER") return { error: "Only the owner changes campus structure." };
  const school = await prisma.school.findUnique({ where: { id: user.schoolId }, select: { tier: true } });
  if (on && school?.tier !== "ENTERPRISE") return { error: "Multi-campus is an Enterprise feature — switch plan first." };
  await prisma.school.update({ where: { id: user.schoolId }, data: { multiCampus: on } });
  refresh();
  return { ok: true };
}

export async function createCampus(_prev: OrgState, formData: FormData): Promise<OrgState> {
  const user = await requireUser();
  if (user.role !== "OWNER") return { error: "Only the owner manages campuses." };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Campus name is required." };
  try {
    await prisma.campus.create({ data: { schoolId: user.schoolId, name } });
  } catch {
    return { error: `Campus "${name}" already exists.` };
  }
  refresh();
  return { ok: true };
}

export async function deleteCampus(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (user.role !== "OWNER") return;
  const id = String(formData.get("id") ?? "");
  // Classes keep existing; their campusId goes null (SetNull).
  if (id) await prisma.campus.deleteMany({ where: { id, schoolId: user.schoolId } });
  refresh();
}

export async function assignClassCampus(classId: string, campusId: string | null): Promise<OrgState> {
  const user = await requireUser();
  if (user.role !== "OWNER") return { error: "Only the owner assigns campuses." };
  if (campusId) {
    const campus = await prisma.campus.findFirst({ where: { id: campusId, schoolId: user.schoolId } });
    if (!campus) return { error: "Campus not found." };
  }
  await prisma.class.updateMany({ where: { id: classId, schoolId: user.schoolId }, data: { campusId } });
  refresh();
  revalidatePath("/people/classes");
  return { ok: true };
}
