"use server";

// Save attendance for a class on a given day. We upsert one row per student
// (keyed by studentId + date), so re-marking edits rather than duplicating.
// Every write is scoped to the user's school, and only students who actually
// belong to the chosen class can be marked.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { ATT_STATUSES, type SaveAttendanceResult } from "@/lib/attendance";

export async function saveAttendance(
  classId: string,
  dateStr: string,
  entries: { studentId: string; status: string }[],
): Promise<SaveAttendanceResult> {
  const user = await requireUser();
  if (!classId || !dateStr) return { error: "Pick a class and a date first." };

  const klass = await prisma.class.findFirst({ where: { id: classId, schoolId: user.schoolId } });
  if (!klass) return { error: "Class not found." };

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return { error: "That date isn't valid." };

  // Only allow marking students who really are in this class & school.
  const valid = new Set(
    (await prisma.student.findMany({ where: { schoolId: user.schoolId, classId }, select: { id: true } })).map((s) => s.id),
  );
  const allowed = (ATT_STATUSES as readonly string[]);

  const ops = entries
    .filter((e) => valid.has(e.studentId) && allowed.includes(e.status))
    .map((e) =>
      prisma.attendance.upsert({
        where: { studentId_date: { studentId: e.studentId, date } },
        create: { schoolId: user.schoolId, studentId: e.studentId, classId, date, status: e.status, recordedBy: user.staffId },
        update: { status: e.status, classId, recordedBy: user.staffId },
      }),
    );

  if (ops.length === 0) return { error: "Nothing to save." };

  try {
    await prisma.$transaction(ops);
  } catch {
    return { error: "Could not save attendance. Please try again." };
  }
  revalidatePath("/dashboard/attendance");
  revalidatePath("/people/attendance");
  revalidatePath("/");
  revalidatePath("/dashboard");
  return { ok: true, saved: ops.length };
}
