import "server-only";

// Report-card remarks (writes). The FORM teacher of a student's class writes the
// overall class-teacher remark; Owner/HOS may also. Subject remarks are written
// through the results grid (scoped to the subject teacher's assignment).

import { prisma } from "@/lib/db";
import { canManageClasses } from "@/lib/auth/permissions";
import { type Ctx, ServiceError } from "@/server/context";

export const reportCardsService = {
  /** Save the form teacher's overall remark for a student (current term). */
  async saveClassRemark(ctx: Ctx, studentId: string, remark: string): Promise<void> {
    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId: ctx.schoolId }, select: { id: true, classId: true } });
    if (!student) throw new ServiceError("Student not found.", "NOT_FOUND");

    // Owner/HOS always; a teacher only for the class they are the FORM teacher of.
    let allowed = canManageClasses(ctx.role);
    if (!allowed && ctx.role === "TEACHER" && student.classId) {
      const owns = await prisma.class.findFirst({ where: { id: student.classId, schoolId: ctx.schoolId, teacherId: ctx.staffId }, select: { id: true } });
      allowed = !!owns;
    }
    if (!allowed) throw new ServiceError("Only the form teacher of this class (or school leadership) can write the class-teacher remark.");

    const school = await prisma.school.findUnique({ where: { id: ctx.schoolId }, select: { session: true, term: true } });
    const session = school?.session;
    const term = school?.term;
    if (!session || !term) throw new ServiceError("Set your school's current session and term first.", "INVALID");

    const text = remark.trim() || null;
    await prisma.reportRemark.upsert({
      where: { studentId_session_term: { studentId, session, term } },
      create: { schoolId: ctx.schoolId, studentId, session, term, classTeacherRemark: text, authorId: ctx.staffId },
      update: { classTeacherRemark: text, authorId: ctx.staffId },
    });
  },
};
