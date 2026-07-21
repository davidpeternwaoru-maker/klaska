import "server-only";

// Attendance — single source of truth for the marker screen (reads) and for
// saving a class's marks (writes). Owner/Bursar/Admin VIEW; HOS, teachers (own
// class) and HODs MARK. Absence alerts to parents are logged as a Notice.

import { prisma } from "@/lib/db";
import { canMarkAttendance } from "@/lib/auth/permissions";
import { ATT_STATUSES } from "@/lib/attendance";
import { type Ctx, ServiceError, classScopeWhere } from "@/server/context";

const classLabel = (c: { name: string; arm: string | null }) => (c.arm ? `${c.name} ${c.arm}` : c.name);

export type MarkerData = {
  hasClasses: boolean;
  classOptions: { value: string; label: string }[];
  classId: string;
  students: { id: string; name: string }[];
  existing: Record<string, string>;
  canMark: boolean;
};

export const attendanceService = {
  /** Everything the marker screen needs for a chosen class + day. */
  async marker(ctx: Ctx, params: { classId?: string; date?: string }): Promise<MarkerData> {
    const today = new Date().toISOString().slice(0, 10);
    const date = params.date || today;
    const classes = await prisma.class.findMany({ where: classScopeWhere(ctx), orderBy: [{ name: "asc" }, { arm: "asc" }] });
    const classId = params.classId || classes[0]?.id || "";
    const classOptions = classes.map((c) => ({ value: c.id, label: classLabel(c) }));

    let students: { id: string; name: string }[] = [];
    let existing: Record<string, string> = {};
    if (classId) {
      const list = await prisma.student.findMany({ where: { schoolId: ctx.schoolId, classId }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] });
      students = list.map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}` }));
      const marks = await prisma.attendance.findMany({ where: { schoolId: ctx.schoolId, classId, date: new Date(date) } });
      existing = Object.fromEntries(marks.map((m) => [m.studentId, m.status]));
    }
    return { hasClasses: classes.length > 0, classOptions, classId, students, existing, canMark: canMarkAttendance(ctx.role) };
  },

  /** Upsert one row per student (studentId + date), scoped + validated. Returns count saved. */
  async save(ctx: Ctx, classId: string, dateStr: string, entries: { studentId: string; status: string }[]): Promise<number> {
    if (!canMarkAttendance(ctx.role)) throw new ServiceError("Your role can view attendance but not mark it.");
    if (!classId || !dateStr) throw new ServiceError("Pick a class and a date first.", "INVALID");

    const klass = await prisma.class.findFirst({ where: { id: classId, schoolId: ctx.schoolId } });
    if (!klass) throw new ServiceError("Class not found.", "NOT_FOUND");
    if (ctx.role === "TEACHER" && klass.teacherId !== ctx.staffId) throw new ServiceError("You can only mark attendance for your own class.");

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) throw new ServiceError("That date isn't valid.", "INVALID");

    const school = await prisma.school.findUnique({ where: { id: ctx.schoolId }, select: { session: true, term: true } });
    const session = school?.session ?? null;
    const term = school?.term ?? null;

    const valid = new Set((await prisma.student.findMany({ where: { schoolId: ctx.schoolId, classId }, select: { id: true } })).map((s) => s.id));
    const allowed = ATT_STATUSES as readonly string[];

    const ops = entries
      .filter((e) => valid.has(e.studentId) && allowed.includes(e.status))
      .map((e) =>
        prisma.attendance.upsert({
          where: { studentId_date: { studentId: e.studentId, date } },
          create: { schoolId: ctx.schoolId, studentId: e.studentId, classId, date, status: e.status, session, term, recordedBy: ctx.staffId },
          update: { status: e.status, classId, session, term, recordedBy: ctx.staffId },
        }),
      );
    if (ops.length === 0) throw new ServiceError("Nothing to save.", "INVALID");

    try {
      await prisma.$transaction(ops);
    } catch {
      throw new ServiceError("Could not save attendance. Please try again.");
    }

    // Flow 2: absence alerts to affected parents — one aggregated notice.
    const absent = entries.filter((e) => valid.has(e.studentId) && e.status === "ABSENT");
    if (absent.length > 0) {
      const names = await prisma.student.findMany({ where: { id: { in: absent.map((a) => a.studentId) } }, select: { firstName: true, lastName: true } });
      await prisma.notice.create({
        data: {
          schoolId: ctx.schoolId,
          audience: "PARENTS",
          title: `Absence alert — ${classLabel(klass)}`,
          body: `Absent on ${dateStr}: ${names.map((n) => `${n.firstName} ${n.lastName}`).join(", ")}. Parents will be notified.`,
          sentBy: "Klaska (automatic)",
        },
      });
    }
    return ops.length;
  },
};
