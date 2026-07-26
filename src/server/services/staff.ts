import "server-only";

// Staff — single source of truth for team members and their logins. Only the
// OWNER or BURSAR may manage staff (CAN_MANAGE_STAFF); adding a member creates
// their sign-in (email + initial password).

import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { CAN_MANAGE_STAFF } from "@/lib/auth/guard";
import type { Role } from "@/lib/auth/jwt";
import { type Ctx, ServiceError } from "@/server/context";
import { logAudit } from "@/server/services/audit";

export type StaffRow = { id: string; name: string; email: string; role: Role; title: string | null; phone: string | null; isSelf: boolean };
export type StaffInput = { name: string; email: string; title?: string | null; phone?: string | null; password: string; role?: string };

const ROLES: Role[] = ["OWNER", "HOS", "BURSAR", "HOD", "TEACHER", "ADMIN"];
const requireManage = (ctx: Ctx) => {
  if (!CAN_MANAGE_STAFF.includes(ctx.role)) throw new ServiceError("You don't have permission to do that.");
};

export const staffService = {
  async list(ctx: Ctx): Promise<StaffRow[]> {
    const rows = await prisma.staff.findMany({ where: { schoolId: ctx.schoolId }, orderBy: { createdAt: "asc" } });
    return rows.map((s) => ({ id: s.id, name: s.name, email: s.email, role: s.role, title: s.title, phone: s.phone, isSelf: s.id === ctx.staffId }));
  },

  async create(ctx: Ctx, input: StaffInput): Promise<void> {
    requireManage(ctx);
    const name = input.name?.trim();
    const email = input.email?.trim().toLowerCase();
    const role: Role = ROLES.includes(input.role as Role) ? (input.role as Role) : "TEACHER";
    if (!name || !email) throw new ServiceError("Name and email are required.", "INVALID");
    if ((input.password ?? "").length < 6) throw new ServiceError("Initial password must be at least 6 characters.", "INVALID");
    const existing = await prisma.staff.findUnique({ where: { email } });
    if (existing) throw new ServiceError("A staff member with that email already exists.", "INVALID");
    const created = await prisma.staff.create({
      data: { schoolId: ctx.schoolId, name, email, title: input.title?.trim() || null, phone: input.phone?.trim() || null, role, passwordHash: await hashPassword(input.password) },
    });
    await logAudit({ action: "STAFF_CREATE", schoolId: ctx.schoolId, actorId: ctx.staffId, actorEmail: ctx.email, target: created.id, meta: { role, email } });
  },

  async remove(ctx: Ctx, id: string): Promise<void> {
    requireManage(ctx);
    // Never delete your own account (would lock you out).
    if (id && id !== ctx.staffId) {
      const res = await prisma.staff.deleteMany({ where: { id, schoolId: ctx.schoolId } });
      if (res.count > 0) await logAudit({ action: "STAFF_REMOVE", schoolId: ctx.schoolId, actorId: ctx.staffId, actorEmail: ctx.email, target: id });
    }
  },

  async resetPassword(ctx: Ctx, id: string, password: string): Promise<void> {
    requireManage(ctx);
    if ((password ?? "").length < 8) throw new ServiceError("New password must be at least 8 characters.", "INVALID");
    // Bumping tokenVersion revokes every existing session for that account.
    const res = await prisma.staff.updateMany({ where: { id, schoolId: ctx.schoolId }, data: { passwordHash: await hashPassword(password), tokenVersion: { increment: 1 } } });
    if (res.count === 0) throw new ServiceError("Staff member not found.", "NOT_FOUND");
    await logAudit({ action: "PASSWORD_RESET", schoolId: ctx.schoolId, actorId: ctx.staffId, actorEmail: ctx.email, target: id });
  },
};
