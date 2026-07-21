import "server-only";

// Account — self-service. Any signed-in staff member changes THEIR OWN password.
// (Owner-driven resets live in staffService.resetPassword.)

import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { type Ctx, ServiceError } from "@/server/context";

export const accountService = {
  async changePassword(ctx: Ctx, current: string, next: string, confirm: string): Promise<void> {
    if ((next ?? "").length < 6) throw new ServiceError("New password must be at least 6 characters.", "INVALID");
    if (next !== confirm) throw new ServiceError("New passwords don't match.", "INVALID");
    const staff = await prisma.staff.findUnique({ where: { id: ctx.staffId } });
    if (!staff || staff.schoolId !== ctx.schoolId) throw new ServiceError("Account not found.", "NOT_FOUND");
    if (!(await verifyPassword(current, staff.passwordHash))) throw new ServiceError("Your current password is incorrect.", "INVALID");
    await prisma.staff.update({ where: { id: staff.id }, data: { passwordHash: await hashPassword(next) } });
  },
};
