"use server";

// Save attendance for a class on a given day. We upsert one row per student
// (keyed by studentId + date), so re-marking edits rather than duplicating.
// Every write is scoped to the user's school, and only students who actually
// belong to the chosen class can be marked.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { ATT_STATUSES, type SaveAttendanceResult } from "@/lib/attendance";
import { canMarkAttendance } from "@/lib/auth/permissions";

export async function saveAttendance(
  classId: string,
  dateStr: string,
  entries: { studentId: string; status: string }[],
): Promise<SaveAttendanceResult> {
  const user = await requireUser();
  // Matrix: Owner/Bursar/Admin VIEW attendance; only HOS, teachers (own class)
  // and HODs mark it.
  if (!canMarkAttendance(user.role)) return { error: "Your role can view attendance but not mark it." };
  if (!classId || !dateStr) return { error: "Pick a class and a date first." };

  const klass = await prisma.class.findFirst({ where: { id: classId, schoolId: user.schoolId } });
  if (!klass) return { error: "Class not found." };
  // Teachers may only mark classes assigned to them (Permission Matrix).
  if (user.role === "TEACHER" && klass.teacherId !== user.staffId) {
    return { error: "You can only mark attendance for your own class." };
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return { error: "That date isn't valid." };

  // Every attendance event belongs to a term (§6) — snapshot the calendar.
  const school = await prisma.school.findUnique({ where: { id: user.schoolId }, select: { session: true, term: true } });
  const session = school?.session ?? null;
  const term = school?.term ?? null;

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
        create: { schoolId: user.schoolId, studentId: e.studentId, classId, date, status: e.status, session, term, recordedBy: user.staffId },
        update: { status: e.status, classId, session, term, recordedBy: user.staffId },
      }),
    );

  if (ops.length === 0) return { error: "Nothing to save." };

  try {
    await prisma.$transaction(ops);
  } catch {
    return { error: "Could not save attendance. Please try again." };
  }

  // Flow 2: absence alerts go to affected parents — log one aggregated notice.
  const absent = entries.filter((e) => valid.has(e.studentId) && e.status === "ABSENT");
  if (absent.length > 0) {
    const names = await prisma.student.findMany({ where: { id: { in: absent.map((a) => a.studentId) } }, select: { firstName: true, lastName: true } });
    const label = klass.arm ? `${klass.name} ${klass.arm}` : klass.name;
    await prisma.notice.create({
      data: {
        schoolId: user.schoolId,
        audience: "PARENTS",
        title: `Absence alert — ${label}`,
        body: `Absent on ${dateStr}: ${names.map((n) => `${n.firstName} ${n.lastName}`).join(", ")}. Parents will be notified.`,
        sentBy: "Klaska (automatic)",
      },
    });
  }
  revalidatePath("/dashboard/attendance");
  revalidatePath("/people/attendance");
  revalidatePath("/");
  revalidatePath("/dashboard");
  return { ok: true, saved: ops.length };
}
