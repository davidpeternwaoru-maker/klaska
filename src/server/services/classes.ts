import "server-only";

// Classes — single source of truth for class/arm records and form-teacher
// assignment. Owner/HOS manage; teachers see only their own (read-only).

import { prisma } from "@/lib/db";
import { canManageClasses } from "@/lib/auth/permissions";
import { type Ctx, ServiceError, classScopeWhere } from "@/server/context";

export type ClassRow = { id: string; name: string; arm: string | null; teacherName: string | null; studentCount: number };
export type TeacherOption = { id: string; name: string };
export type ClassInput = { name: string; arm?: string | null; teacherId?: string | null };

const requireManage = (ctx: Ctx) => {
  if (!canManageClasses(ctx.role)) throw new ServiceError("Only the owner or principal manages classes.");
};
const label = (name: string, arm: string | null | undefined) => `${name}${arm ? " " + arm : ""}`;

export const classesService = {
  /** Classes visible to the ctx (teachers → their own), with counts + teacher. */
  async list(ctx: Ctx): Promise<ClassRow[]> {
    const rows = await prisma.class.findMany({
      where: classScopeWhere(ctx),
      include: { teacher: true, _count: { select: { students: true } } },
      orderBy: [{ name: "asc" }, { arm: "asc" }],
    });
    return rows.map((c) => ({ id: c.id, name: c.name, arm: c.arm, teacherName: c.teacher?.name ?? null, studentCount: c._count.students }));
  },

  /** Staff selectable as form teachers (managers only; else empty). */
  async teacherOptions(ctx: Ctx): Promise<TeacherOption[]> {
    if (!canManageClasses(ctx.role)) return [];
    const rows = await prisma.staff.findMany({ where: { schoolId: ctx.schoolId }, orderBy: { name: "asc" }, select: { id: true, name: true } });
    return rows.map((s) => ({ id: s.id, name: s.name }));
  },

  async create(ctx: Ctx, input: ClassInput): Promise<void> {
    requireManage(ctx);
    const name = input.name?.trim();
    const arm = input.arm?.trim() || null;
    const teacherId = input.teacherId?.trim() || null;
    if (!name) throw new ServiceError("Class name is required (e.g. JSS 1).", "INVALID");
    if (teacherId) {
      const teacher = await prisma.staff.findFirst({ where: { id: teacherId, schoolId: ctx.schoolId }, select: { id: true } });
      if (!teacher) throw new ServiceError("Selected teacher was not found.", "INVALID");
    }
    try {
      await prisma.class.create({ data: { schoolId: ctx.schoolId, name, arm, teacherId } });
    } catch {
      throw new ServiceError(`Class "${label(name, arm)}" already exists.`, "INVALID");
    }
  },

  async update(ctx: Ctx, id: string, input: ClassInput): Promise<void> {
    requireManage(ctx);
    const name = input.name?.trim();
    const arm = input.arm?.trim() || null;
    if (!id || !name) throw new ServiceError("Class name is required.", "INVALID");
    try {
      const res = await prisma.class.updateMany({ where: { id, schoolId: ctx.schoolId }, data: { name, arm } });
      if (res.count === 0) throw new ServiceError("Class not found.", "NOT_FOUND");
    } catch (e) {
      if (e instanceof ServiceError) throw e;
      throw new ServiceError(`"${label(name, arm)}" already exists.`, "INVALID");
    }
  },

  async remove(ctx: Ctx, id: string): Promise<void> {
    requireManage(ctx);
    // Students in a deleted class keep their record (classId → null, onDelete: SetNull).
    if (id) await prisma.class.deleteMany({ where: { id, schoolId: ctx.schoolId } });
  },
};
