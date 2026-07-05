"use server";

// Subjects + results. Scores are entered per class + subject; we compute total
// and grade on the server (single source of truth) and upsert one row per
// student+subject. Everything is school-scoped.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { gradeFor, CA1_MAX, CA2_MAX, EXAM_MAX, type SaveResultsResult } from "@/lib/results";
import { canEnterScores, canManageSubjects } from "@/lib/auth/permissions";

export type ActionState = { error?: string; ok?: boolean };

/* ----- subjects ----- */
export async function createSubject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!canManageSubjects(user.role)) return { error: "Only the owner or principal manages subjects." };
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim() || null;
  if (!name) return { error: "Subject name is required." };
  try {
    await prisma.subject.create({ data: { schoolId: user.schoolId, name, code } });
  } catch {
    return { error: `"${name}" already exists.` };
  }
  revalidatePath("/dashboard/subjects");
  revalidatePath("/dashboard/results");
  revalidatePath("/academics/results");
  return { ok: true };
}

/** Wizard: create many subjects at once (skips ones that already exist). */
export async function createSubjectsBulk(names: string[]): Promise<ActionState> {
  const user = await requireUser();
  const clean = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
  if (clean.length) {
    await prisma.subject.createMany({ data: clean.map((name) => ({ schoolId: user.schoolId, name })), skipDuplicates: true });
  }
  revalidatePath("/dashboard/subjects");
  revalidatePath("/academics/results");
  return { ok: true };
}

export async function deleteSubject(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!canManageSubjects(user.role)) return;
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.subject.deleteMany({ where: { id, schoolId: user.schoolId } });
  revalidatePath("/dashboard/subjects");
  revalidatePath("/dashboard/results");
  revalidatePath("/academics/results");
}

/* ----- results ----- */
// Parse a cell to an integer within [0, max], or null if blank/invalid.
function clampScore(v: unknown, max: number): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  if (isNaN(n)) return null;
  return Math.max(0, Math.min(max, Math.round(n)));
}

export async function saveResults(
  subjectId: string,
  classId: string,
  entries: { studentId: string; ca1?: unknown; ca2?: unknown; exam?: unknown }[],
): Promise<SaveResultsResult> {
  const user = await requireUser();
  // Matrix: Owner VIEWS scores; HOS full, teachers own class, HOD dept.
  if (!canEnterScores(user.role)) return { error: "Your role can view scores but not enter them." };
  if (!subjectId || !classId) return { error: "Pick a class and a subject first." };

  const [subject, klass, school] = await Promise.all([
    prisma.subject.findFirst({ where: { id: subjectId, schoolId: user.schoolId } }),
    prisma.class.findFirst({ where: { id: classId, schoolId: user.schoolId } }),
    prisma.school.findUnique({ where: { id: user.schoolId }, select: { session: true, term: true } }),
  ]);
  if (!subject) return { error: "Subject not found." };
  if (!klass) return { error: "Class not found." };
  // Teachers may only enter scores for their own class (Permission Matrix).
  if (user.role === "TEACHER" && klass.teacherId !== user.staffId) {
    return { error: "You can only enter results for your own class." };
  }
  const session = school?.session ?? null;
  const term = school?.term ?? null;

  const valid = new Set(
    (await prisma.student.findMany({ where: { schoolId: user.schoolId, classId }, select: { id: true } })).map((s) => s.id),
  );

  const ops = entries
    .filter((e) => valid.has(e.studentId))
    .map((e) => {
      const ca1 = clampScore(e.ca1, CA1_MAX);
      const ca2 = clampScore(e.ca2, CA2_MAX);
      const exam = clampScore(e.exam, EXAM_MAX);
      const hasAny = ca1 != null || ca2 != null || exam != null;
      const total = hasAny ? (ca1 ?? 0) + (ca2 ?? 0) + (exam ?? 0) : null;
      const grade = total != null ? gradeFor(total) : null;
      return { e, ca1, ca2, exam, total, grade, hasAny };
    })
    .filter((x) => x.hasAny)
    .map((x) =>
      prisma.result.upsert({
        where: { studentId_subjectId: { studentId: x.e.studentId, subjectId } },
        create: { schoolId: user.schoolId, studentId: x.e.studentId, subjectId, classId, ca1: x.ca1, ca2: x.ca2, exam: x.exam, total: x.total, grade: x.grade, session, term, recordedBy: user.staffId },
        update: { ca1: x.ca1, ca2: x.ca2, exam: x.exam, total: x.total, grade: x.grade, classId, session, term, recordedBy: user.staffId },
      }),
    );

  if (ops.length === 0) return { error: "Enter at least one score." };

  try {
    await prisma.$transaction(ops);
  } catch {
    return { error: "Could not save results. Please try again." };
  }
  revalidatePath("/dashboard/results");
  revalidatePath("/academics/results");
  return { ok: true, saved: ops.length };
}
