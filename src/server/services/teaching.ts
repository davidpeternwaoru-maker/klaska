import "server-only";

// Teaching duties — the two independent teacher↔class relationships:
//   1. FORM teacher: a teacher owns AT MOST one class (Class.teacherId).
//   2. SUBJECT assignments: (subject × class) pairs the teacher teaches.
// Managed by the OWNER or HOS (academic leadership), enforced server-side here.

import { prisma } from "@/lib/db";
import { canManageTeaching } from "@/lib/auth/permissions";
import { type Ctx, ServiceError } from "@/server/context";

const classLabel = (c: { name: string; arm: string | null }) => (c.arm ? `${c.name} ${c.arm}` : c.name);
const requireManage = (ctx: Ctx) => {
  if (!canManageTeaching(ctx.role)) throw new ServiceError("Only the owner or principal manages teaching duties.");
};

export type TeachingOptions = { classes: { id: string; label: string }[]; subjects: { id: string; name: string }[] };
export type TeacherTeaching = {
  staffId: string;
  name: string;
  role: string;
  formClassId: string | null;
  formClassLabel: string | null;
  assignments: { id: string; subjectId: string; subjectName: string; classId: string; classLabel: string }[];
};

export const teachingService = {
  /** Class + subject pickers for the assignment UI. */
  async options(ctx: Ctx): Promise<TeachingOptions> {
    requireManage(ctx);
    const [classes, subjects] = await Promise.all([
      prisma.class.findMany({ where: { schoolId: ctx.schoolId }, orderBy: [{ name: "asc" }, { arm: "asc" }], select: { id: true, name: true, arm: true } }),
      prisma.subject.findMany({ where: { schoolId: ctx.schoolId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ]);
    return { classes: classes.map((c) => ({ id: c.id, label: classLabel(c) })), subjects };
  },

  /** A teacher's current form class + subject assignments (for the edit modal). */
  async getForTeacher(ctx: Ctx, staffId: string): Promise<TeacherTeaching> {
    requireManage(ctx);
    const staff = await prisma.staff.findFirst({ where: { id: staffId, schoolId: ctx.schoolId }, select: { id: true, name: true, role: true } });
    if (!staff) throw new ServiceError("Staff member not found.", "NOT_FOUND");
    const [formClass, assignments] = await Promise.all([
      prisma.class.findFirst({ where: { schoolId: ctx.schoolId, teacherId: staffId }, select: { id: true, name: true, arm: true } }),
      prisma.teachingAssignment.findMany({
        where: { schoolId: ctx.schoolId, teacherId: staffId },
        include: { subject: { select: { name: true } }, class: { select: { name: true, arm: true } } },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    return {
      staffId: staff.id,
      name: staff.name,
      role: staff.role,
      formClassId: formClass?.id ?? null,
      formClassLabel: formClass ? classLabel(formClass) : null,
      assignments: assignments.map((a) => ({ id: a.id, subjectId: a.subjectId, subjectName: a.subject.name, classId: a.classId, classLabel: classLabel(a.class) })),
    };
  },

  /** Make a teacher the form teacher of one class (or clear it). A teacher owns
   *  at most one class, so any prior owned class is released first. */
  async setFormClass(ctx: Ctx, staffId: string, classId: string | null): Promise<void> {
    requireManage(ctx);
    const staff = await prisma.staff.findFirst({ where: { id: staffId, schoolId: ctx.schoolId }, select: { id: true } });
    if (!staff) throw new ServiceError("Staff member not found.", "NOT_FOUND");
    await prisma.$transaction(async (tx) => {
      // Release any class this teacher currently owns.
      await tx.class.updateMany({ where: { schoolId: ctx.schoolId, teacherId: staffId }, data: { teacherId: null } });
      if (classId) {
        const klass = await tx.class.findFirst({ where: { id: classId, schoolId: ctx.schoolId }, select: { id: true } });
        if (!klass) throw new ServiceError("Class not found.", "NOT_FOUND");
        // A class has one form teacher — assign it (replaces any other teacher).
        await tx.class.update({ where: { id: classId }, data: { teacherId: staffId } });
      }
    });
  },

  async addAssignment(ctx: Ctx, staffId: string, subjectId: string, classId: string): Promise<void> {
    requireManage(ctx);
    const [staff, subject, klass] = await Promise.all([
      prisma.staff.findFirst({ where: { id: staffId, schoolId: ctx.schoolId }, select: { id: true } }),
      prisma.subject.findFirst({ where: { id: subjectId, schoolId: ctx.schoolId }, select: { id: true } }),
      prisma.class.findFirst({ where: { id: classId, schoolId: ctx.schoolId }, select: { id: true } }),
    ]);
    if (!staff) throw new ServiceError("Staff member not found.", "NOT_FOUND");
    if (!subject) throw new ServiceError("Subject not found.", "INVALID");
    if (!klass) throw new ServiceError("Class not found.", "INVALID");
    try {
      await prisma.teachingAssignment.create({ data: { schoolId: ctx.schoolId, teacherId: staffId, subjectId, classId } });
    } catch {
      throw new ServiceError("That subject is already assigned to this teacher in that class.", "INVALID");
    }
  },

  async removeAssignment(ctx: Ctx, assignmentId: string): Promise<void> {
    requireManage(ctx);
    await prisma.teachingAssignment.deleteMany({ where: { id: assignmentId, schoolId: ctx.schoolId } });
  },
};
