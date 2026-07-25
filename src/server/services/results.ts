import "server-only";

// Results & subjects — single source of truth. Scores are entered per class +
// subject; total and WAEC grade are computed here (server-authoritative) and one
// row per student+subject is upserted. Owner VIEWS; HOS full, teacher own, HOD dept.

import { prisma } from "@/lib/db";
import { gradeFor, CA1_MAX, CA2_MAX, EXAM_MAX } from "@/lib/results";
import { canEnterScores, canManageSubjects } from "@/lib/auth/permissions";
import { type Ctx, ServiceError, classScopeWhere, teacherTeachesSubjectInClass } from "@/server/context";

const classLabel = (c: { name: string; arm: string | null }) => (c.arm ? `${c.name} ${c.arm}` : c.name);

export type ExistingResult = { ca1: number | null; ca2: number | null; exam: number | null; total: number | null; grade: string | null; subjectRemark: string | null };
export type GridData = {
  hasClasses: boolean;
  hasSubjects: boolean;
  classOptions: { value: string; label: string }[];
  subjectOptions: { value: string; label: string }[];
  classId: string;
  subjectId: string;
  students: { id: string; name: string }[];
  existing: Record<string, ExistingResult>;
  canEnter: boolean;
};

function clampScore(v: unknown, max: number): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  if (isNaN(n)) return null;
  return Math.max(0, Math.min(max, Math.round(n)));
}

export const resultsService = {
  /** Everything the results-entry grid needs for a class + subject.
   *  For a TEACHER the class + subject pickers are driven by their subject
   *  assignments: they can only pick classes they teach, and within a class only
   *  the subjects they teach there. Leadership sees every class + subject. */
  async grid(ctx: Ctx, params: { classId?: string; subjectId?: string }): Promise<GridData> {
    let classOptions: { value: string; label: string }[];
    let subjectOptions: { value: string; label: string }[];
    let classId: string;
    let subjectId: string;

    if (ctx.role === "TEACHER") {
      const assigns = await prisma.teachingAssignment.findMany({
        where: { schoolId: ctx.schoolId, teacherId: ctx.staffId },
        include: { subject: { select: { id: true, name: true } }, class: { select: { id: true, name: true, arm: true } } },
        orderBy: { createdAt: "asc" },
      });
      const classMap = new Map<string, string>();
      for (const a of assigns) classMap.set(a.classId, classLabel(a.class));
      classOptions = [...classMap].map(([value, label]) => ({ value, label }));
      classId = params.classId && classMap.has(params.classId) ? params.classId : classOptions[0]?.value ?? "";
      const subjMap = new Map<string, string>();
      for (const a of assigns) if (a.classId === classId) subjMap.set(a.subject.id, a.subject.name);
      subjectOptions = [...subjMap].map(([value, label]) => ({ value, label }));
      subjectId = params.subjectId && subjMap.has(params.subjectId) ? params.subjectId : subjectOptions[0]?.value ?? "";
    } else {
      const [classes, subjects] = await Promise.all([
        prisma.class.findMany({ where: classScopeWhere(ctx), orderBy: [{ name: "asc" }, { arm: "asc" }] }),
        prisma.subject.findMany({ where: { schoolId: ctx.schoolId }, orderBy: { name: "asc" } }),
      ]);
      classOptions = classes.map((c) => ({ value: c.id, label: classLabel(c) }));
      subjectOptions = subjects.map((s) => ({ value: s.id, label: s.name }));
      classId = params.classId || classes[0]?.id || "";
      subjectId = params.subjectId || subjects[0]?.id || "";
    }

    let students: { id: string; name: string }[] = [];
    let existing: Record<string, ExistingResult> = {};
    if (classId && subjectId) {
      const list = await prisma.student.findMany({ where: { schoolId: ctx.schoolId, classId }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] });
      students = list.map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}` }));
      const rows = await prisma.result.findMany({ where: { schoolId: ctx.schoolId, subjectId, studentId: { in: students.map((s) => s.id) } } });
      existing = Object.fromEntries(rows.map((r) => [r.studentId, { ca1: r.ca1, ca2: r.ca2, exam: r.exam, total: r.total, grade: r.grade, subjectRemark: r.subjectRemark }]));
    }
    return {
      hasClasses: classOptions.length > 0,
      hasSubjects: subjectOptions.length > 0,
      classOptions,
      subjectOptions,
      classId,
      subjectId,
      students,
      existing,
      canEnter: canEnterScores(ctx.role),
    };
  },

  async save(ctx: Ctx, subjectId: string, classId: string, entries: { studentId: string; ca1?: unknown; ca2?: unknown; exam?: unknown; subjectRemark?: unknown }[]): Promise<number> {
    if (!canEnterScores(ctx.role)) throw new ServiceError("Your role can view scores but not enter them.");
    if (!subjectId || !classId) throw new ServiceError("Pick a class and a subject first.", "INVALID");

    const [subject, klass, school] = await Promise.all([
      prisma.subject.findFirst({ where: { id: subjectId, schoolId: ctx.schoolId } }),
      prisma.class.findFirst({ where: { id: classId, schoolId: ctx.schoolId } }),
      prisma.school.findUnique({ where: { id: ctx.schoolId }, select: { session: true, term: true } }),
    ]);
    if (!subject) throw new ServiceError("Subject not found.", "NOT_FOUND");
    if (!klass) throw new ServiceError("Class not found.", "NOT_FOUND");
    // A teacher may enter scores ONLY for a subject they're assigned in THIS class.
    if (ctx.role === "TEACHER" && !(await teacherTeachesSubjectInClass(ctx, subjectId, classId))) {
      throw new ServiceError("You can only enter scores for subjects you teach in classes you're assigned to.");
    }
    // Results are now history: each belongs to a specific session + term, so a
    // current term must be set (results accumulate instead of overwriting).
    const session = school?.session ?? null;
    const term = school?.term ?? null;
    if (!session || !term) throw new ServiceError("Set your school's current session and term in Settings before entering results.", "INVALID");

    const valid = new Set((await prisma.student.findMany({ where: { schoolId: ctx.schoolId, classId }, select: { id: true } })).map((s) => s.id));

    const ops = entries
      .filter((e) => valid.has(e.studentId))
      .map((e) => {
        const ca1 = clampScore(e.ca1, CA1_MAX);
        const ca2 = clampScore(e.ca2, CA2_MAX);
        const exam = clampScore(e.exam, EXAM_MAX);
        const hasAny = ca1 != null || ca2 != null || exam != null;
        const total = hasAny ? (ca1 ?? 0) + (ca2 ?? 0) + (exam ?? 0) : null;
        const remark = typeof e.subjectRemark === "string" ? e.subjectRemark.trim() || null : undefined;
        return { e, ca1, ca2, exam, total, grade: total != null ? gradeFor(total) : null, hasAny, remark };
      })
      // Persist a row if it has any score OR a written subject remark.
      .filter((x) => x.hasAny || x.remark != null)
      .map((x) =>
        prisma.result.upsert({
          where: { studentId_subjectId_session_term: { studentId: x.e.studentId, subjectId, session, term } },
          create: { schoolId: ctx.schoolId, studentId: x.e.studentId, subjectId, classId, ca1: x.ca1, ca2: x.ca2, exam: x.exam, total: x.total, grade: x.grade, subjectRemark: x.remark ?? null, session, term, recordedBy: ctx.staffId },
          update: { ca1: x.ca1, ca2: x.ca2, exam: x.exam, total: x.total, grade: x.grade, ...(x.remark !== undefined ? { subjectRemark: x.remark } : {}), classId, recordedBy: ctx.staffId },
        }),
      );
    if (ops.length === 0) throw new ServiceError("Enter at least one score or remark.", "INVALID");
    try {
      await prisma.$transaction(ops);
    } catch {
      throw new ServiceError("Could not save results. Please try again.");
    }
    return ops.length;
  },

  // ── subjects ──
  async subjects(ctx: Ctx): Promise<{ id: string; name: string; code: string | null }[]> {
    const rows = await prisma.subject.findMany({ where: { schoolId: ctx.schoolId }, orderBy: { name: "asc" } });
    return rows.map((s) => ({ id: s.id, name: s.name, code: s.code }));
  },

  async createSubject(ctx: Ctx, input: { name: string; code?: string | null }): Promise<void> {
    if (!canManageSubjects(ctx.role)) throw new ServiceError("Only the owner or principal manages subjects.");
    const name = input.name?.trim();
    if (!name) throw new ServiceError("Subject name is required.", "INVALID");
    try {
      await prisma.subject.create({ data: { schoolId: ctx.schoolId, name, code: input.code?.trim() || null } });
    } catch {
      throw new ServiceError(`"${name}" already exists.`, "INVALID");
    }
  },

  // Wizard helper (onboarding, owner-driven) — mirrors the original: no extra guard.
  async createSubjectsBulk(ctx: Ctx, names: string[]): Promise<void> {
    const clean = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
    if (clean.length) await prisma.subject.createMany({ data: clean.map((name) => ({ schoolId: ctx.schoolId, name })), skipDuplicates: true });
  },

  async deleteSubject(ctx: Ctx, id: string): Promise<void> {
    if (!canManageSubjects(ctx.role)) throw new ServiceError("Only the owner or principal manages subjects.");
    if (id) await prisma.subject.deleteMany({ where: { id, schoolId: ctx.schoolId } });
  },
};
