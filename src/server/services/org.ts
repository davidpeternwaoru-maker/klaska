import "server-only";

// Organisation — plan tier + multi-campus structure. Owner only (Matrix:
// Settings & billing = Owner Full).

import { prisma } from "@/lib/db";
import { type Ctx, ServiceError } from "@/server/context";

const requireOwner = (ctx: Ctx, what: string) => {
  if (ctx.role !== "OWNER") throw new ServiceError(`Only the owner ${what}.`);
};

export const orgService = {
  async setTier(ctx: Ctx, tier: string): Promise<void> {
    requireOwner(ctx, "changes the plan");
    if (!["BASIC", "ENTERPRISE"].includes(tier)) throw new ServiceError("Unknown plan.", "INVALID");
    await prisma.school.update({ where: { id: ctx.schoolId }, data: { tier } });
  },

  async toggleMultiCampus(ctx: Ctx, on: boolean): Promise<void> {
    requireOwner(ctx, "changes campus structure");
    const school = await prisma.school.findUnique({ where: { id: ctx.schoolId }, select: { tier: true } });
    if (on && school?.tier !== "ENTERPRISE") throw new ServiceError("Multi-campus is an Enterprise feature — switch plan first.", "INVALID");
    await prisma.school.update({ where: { id: ctx.schoolId }, data: { multiCampus: on } });
  },

  async createCampus(ctx: Ctx, name: string): Promise<void> {
    requireOwner(ctx, "manages campuses");
    const n = name?.trim();
    if (!n) throw new ServiceError("Campus name is required.", "INVALID");
    try {
      await prisma.campus.create({ data: { schoolId: ctx.schoolId, name: n } });
    } catch {
      throw new ServiceError(`Campus "${n}" already exists.`, "INVALID");
    }
  },

  async deleteCampus(ctx: Ctx, id: string): Promise<void> {
    requireOwner(ctx, "manages campuses");
    if (id) await prisma.campus.deleteMany({ where: { id, schoolId: ctx.schoolId } });
  },

  async assignClassCampus(ctx: Ctx, classId: string, campusId: string | null): Promise<void> {
    requireOwner(ctx, "assigns campuses");
    if (campusId) {
      const campus = await prisma.campus.findFirst({ where: { id: campusId, schoolId: ctx.schoolId }, select: { id: true } });
      if (!campus) throw new ServiceError("Campus not found.", "NOT_FOUND");
    }
    await prisma.class.updateMany({ where: { id: classId, schoolId: ctx.schoolId }, data: { campusId } });
  },
};
