import "server-only";

// Notifications — the school's message log (notices) + fee-collection prefs.
// Owners & bursars message (CAN_MANAGE_STAFF); only the owner sets fee prefs.

import { prisma } from "@/lib/db";
import { CAN_MANAGE_STAFF } from "@/lib/auth/guard";
import { type Ctx, ServiceError } from "@/server/context";

const AUDIENCES = ["ALL_STAFF", "TEACHERS", "BURSARS", "PARENTS"] as const;
const requireMessaging = (ctx: Ctx) => {
  if (!CAN_MANAGE_STAFF.includes(ctx.role)) throw new ServiceError("You don't have permission to do that.");
};

export type NoticeRow = { id: string; audience: string; title: string | null; body: string; sentBy: string; when: string };

export const notificationsService = {
  async list(ctx: Ctx): Promise<NoticeRow[]> {
    const notices = await prisma.notice.findMany({ where: { schoolId: ctx.schoolId }, orderBy: { createdAt: "desc" }, take: 50 });
    return notices.map((n) => ({
      id: n.id,
      audience: n.audience,
      title: n.title,
      body: n.body,
      sentBy: n.sentBy,
      when: n.createdAt.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
    }));
  },

  async sendNotice(ctx: Ctx, input: { audience: string; title?: string | null; body: string }): Promise<void> {
    requireMessaging(ctx);
    if (!(AUDIENCES as readonly string[]).includes(input.audience)) throw new ServiceError("Pick who to message.", "INVALID");
    const body = input.body?.trim();
    if (!body) throw new ServiceError("Write a message first.", "INVALID");
    await prisma.notice.create({ data: { schoolId: ctx.schoolId, audience: input.audience, title: input.title?.trim() || null, body, sentBy: ctx.name } });
  },

  async deleteNotice(ctx: Ctx, id: string): Promise<void> {
    requireMessaging(ctx);
    if (id) await prisma.notice.deleteMany({ where: { id, schoolId: ctx.schoolId } });
  },

  async saveFeePrefs(ctx: Ctx, data: { feeCollection: string; autoFeeReminders: boolean }): Promise<void> {
    if (ctx.role !== "OWNER") throw new ServiceError("You don't have permission to do that.");
    const mode = data.feeCollection === "VIRTUAL" ? "VIRTUAL" : "MANUAL";
    await prisma.school.update({ where: { id: ctx.schoolId }, data: { feeCollection: mode, autoFeeReminders: !!data.autoFeeReminders } });
  },
};
