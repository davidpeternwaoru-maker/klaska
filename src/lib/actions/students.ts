"use server";

// Server actions for students. Every action calls requireUser() first, then
// scopes all reads/writes to that user's schoolId — so a school can only ever
// touch its own records. revalidatePath() refreshes the page after a change.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { canManageStudents } from "@/lib/auth/permissions";

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
  if (!canManageStudents(user.role)) return { error: "Your role can view students but not edit records." };
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
  revalidatePath("/people/students");
  revalidatePath("/");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateStudent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!canManageStudents(user.role)) return { error: "Your role can view students but not edit records." };
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
  revalidatePath("/people/students");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteStudent(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!canManageStudents(user.role)) return;
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.student.deleteMany({ where: { id, schoolId: user.schoolId } });
  revalidatePath("/dashboard/students");
  revalidatePath("/people/students");
  revalidatePath("/");
  revalidatePath("/dashboard");
}

/* ----------------------------- bulk import ----------------------------- */
// A single parsed spreadsheet row (built in the browser from an .xlsx/CSV).
export type ImportRow = {
  firstName: string;
  lastName: string;
  gender?: string | null;
  dob?: string | null; // ISO yyyy-mm-dd
  admissionNo?: string | null;
  className?: string | null; // free text from the sheet (e.g. "JSS 1 A")
  guardianName?: string | null;
  guardianPhone?: string | null;
};
export type ImportResult = { created: number; classesCreated: string[]; skipped: number; error?: string };

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Insert many students at once. Optionally creates classes named in the sheet
 *  that don't exist yet. Blank admission numbers are auto-generated. */
export async function importStudents(rows: ImportRow[], createMissingClasses: boolean): Promise<ImportResult> {
  const user = await requireUser();
  if (!canManageStudents(user.role)) return { created: 0, classesCreated: [], skipped: 0, error: "Your role cannot import students." };
  if (!rows?.length) return { created: 0, classesCreated: [], skipped: 0, error: "No rows to import." };

  // Build a lookup of this school's existing classes (by "name arm" and by name).
  const existing = await prisma.class.findMany({ where: { schoolId: user.schoolId } });
  const classByLabel = new Map<string, string>();
  for (const c of existing) {
    classByLabel.set(norm(c.arm ? `${c.name} ${c.arm}` : c.name), c.id);
    classByLabel.set(norm(c.name), c.id);
  }
  const classesCreated: string[] = [];

  async function resolveClass(label?: string | null): Promise<string | null> {
    if (!label || !label.trim()) return null;
    const key = norm(label);
    const hit = classByLabel.get(key);
    if (hit) return hit;
    if (!createMissingClasses) return null;
    const created = await prisma.class.create({ data: { schoolId: user.schoolId, name: label.trim() } });
    classByLabel.set(key, created.id);
    classesCreated.push(label.trim());
    return created.id;
  }

  // Only rows with both names are valid; the rest are skipped.
  const valid = rows.filter((r) => r.firstName?.trim() && r.lastName?.trim());
  const skipped = rows.length - valid.length;

  let nextNo = (await prisma.student.count({ where: { schoolId: user.schoolId } })) + 1;
  const data: {
    schoolId: string;
    firstName: string;
    lastName: string;
    admissionNo: string;
    gender: string | null;
    dob: Date | null;
    guardianName: string | null;
    guardianPhone: string | null;
    classId: string | null;
  }[] = [];

  for (const r of valid) {
    const classId = await resolveClass(r.className);
    const admissionNo = r.admissionNo?.trim() || `KLK-${String(nextNo++).padStart(4, "0")}`;
    data.push({
      schoolId: user.schoolId,
      firstName: r.firstName.trim(),
      lastName: r.lastName.trim(),
      admissionNo,
      gender: r.gender?.trim() || null,
      dob: r.dob ? new Date(r.dob) : null,
      guardianName: r.guardianName?.trim() || null,
      guardianPhone: r.guardianPhone?.trim() || null,
      classId,
    });
  }

  let created = 0;
  try {
    const res = await prisma.student.createMany({ data, skipDuplicates: true });
    created = res.count;
  } catch {
    return { created: 0, classesCreated, skipped, error: "Saving failed — check for duplicate admission numbers in the file." };
  }
  revalidatePath("/dashboard/students");
  revalidatePath("/people/students");
  revalidatePath("/");
  revalidatePath("/dashboard");
  return { created, classesCreated, skipped };
}
