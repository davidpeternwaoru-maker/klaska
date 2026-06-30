"use server";

// Server actions for students. Every action calls requireUser() first, then
// scopes all reads/writes to that user's schoolId — so a school can only ever
// touch its own records. revalidatePath() refreshes the page after a change.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";

export type ActionState = { error?: string; ok?: boolean };

/** Generate the next admission number for a school, e.g. KLK-0001. */
async function nextAdmissionNo(schoolId: string): Promise<string> {
  const count = await prisma.student.count({ where: { schoolId } });
  return `KLK-${String(count + 1).padStart(4, "0")}`;
}

function readForm(formData: FormData) {
  return {
    firstName: String(formData.get("firstName") ?? "").trim(),
    lastName: String(formData.get("lastName") ?? "").trim(),
    gender: String(formData.get("gender") ?? "").trim() || null,
    classId: String(formData.get("classId") ?? "").trim() || null,
    guardianName: String(formData.get("guardianName") ?? "").trim() || null,
    guardianPhone: String(formData.get("guardianPhone") ?? "").trim() || null,
    dob: String(formData.get("dob") ?? "").trim(),
    admissionNo: String(formData.get("admissionNo") ?? "").trim(),
  };
}

/** Confirm a class id (if given) actually belongs to this school. */
async function classBelongs(schoolId: string, classId: string | null) {
  if (!classId) return true;
  return !!(await prisma.class.findFirst({ where: { id: classId, schoolId } }));
}

export async function createStudent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const f = readForm(formData);
  if (!f.firstName || !f.lastName) return { error: "First and last name are required." };
  if (!(await classBelongs(user.schoolId, f.classId))) return { error: "Selected class was not found." };

  try {
    await prisma.student.create({
      data: {
        schoolId: user.schoolId,
        firstName: f.firstName,
        lastName: f.lastName,
        admissionNo: f.admissionNo || (await nextAdmissionNo(user.schoolId)),
        gender: f.gender,
        dob: f.dob ? new Date(f.dob) : null,
        guardianName: f.guardianName,
        guardianPhone: f.guardianPhone,
        classId: f.classId,
      },
    });
  } catch {
    return { error: "Could not save — that admission number may already be in use." };
  }
  revalidatePath("/dashboard/students");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateStudent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const f = readForm(formData);
  if (!id) return { error: "Missing student id." };
  if (!f.firstName || !f.lastName) return { error: "First and last name are required." };
  if (!(await classBelongs(user.schoolId, f.classId))) return { error: "Selected class was not found." };

  // updateMany with schoolId in the filter guarantees we can't edit another
  // school's student even if an id were guessed.
  const res = await prisma.student.updateMany({
    where: { id, schoolId: user.schoolId },
    data: {
      firstName: f.firstName,
      lastName: f.lastName,
      gender: f.gender,
      dob: f.dob ? new Date(f.dob) : null,
      guardianName: f.guardianName,
      guardianPhone: f.guardianPhone,
      classId: f.classId,
      ...(f.admissionNo ? { admissionNo: f.admissionNo } : {}),
    },
  });
  if (res.count === 0) return { error: "Student not found." };
  revalidatePath("/dashboard/students");
  return { ok: true };
}

export async function deleteStudent(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.student.deleteMany({ where: { id, schoolId: user.schoolId } });
  revalidatePath("/dashboard/students");
  revalidatePath("/dashboard");
}
