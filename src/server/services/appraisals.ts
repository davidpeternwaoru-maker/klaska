import "server-only";

// Appraisals (writes) — record rater scores, principal sign-off, and reopen.
// One Appraisal row per (subjectStaffId, raterRole, session, term). Reads live in
// @/lib/appraisals (the board/own-appraisal builders composed by the page).

import { prisma } from "@/lib/db";
import { canView, canManage } from "@/lib/auth/permissions";
import type { RaterId } from "@/lib/appraisals/config";
import { type Ctx, ServiceError } from "@/server/context";

async function calendar(schoolId: string) {
  const s = await prisma.school.findUnique({ where: { id: schoolId }, select: { session: true, term: true } });
  return { session: s?.session ?? null, term: s?.term ?? null };
}

export const appraisalsService = {
  /** Record (or update) one rater group's competency scores + comment for a staff member. */
  async saveRating(ctx: Ctx, staffId: string, rater: RaterId, ratings: Record<string, number>, comment: string): Promise<void> {
    if (!canView(ctx.role, "appraisals")) throw new ServiceError("You don't have access to appraisals.");
    // Teachers may only submit their OWN self-appraisal.
    if (ctx.role === "TEACHER" && (rater !== "self" || staffId !== ctx.staffId)) throw new ServiceError("Teachers can only submit their own self-appraisal.");

    const { session, term } = await calendar(ctx.schoolId);
    const vals = Object.values(ratings);
    // Denormalised summary only (precise score is recomputed from the score rows on read).
    const overall = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    const scoreData = Object.entries(ratings).map(([competency, score]) => ({ competency, score: Math.max(1, Math.min(5, Math.round(score))) }));

    const existing = await prisma.appraisal.findFirst({ where: { schoolId: ctx.schoolId, subjectStaffId: staffId, raterRole: rater, session, term } });
    if (existing) {
      await prisma.$transaction([
        prisma.appraisalScore.deleteMany({ where: { appraisalId: existing.id } }),
        prisma.appraisal.update({ where: { id: existing.id }, data: { comment, overall, raterStaffId: ctx.staffId, status: "SUBMITTED", scores: { create: scoreData } } }),
      ]);
    } else {
      await prisma.appraisal.create({
        data: { schoolId: ctx.schoolId, subjectStaffId: staffId, raterStaffId: ctx.staffId, raterRole: rater, session, term, comment, overall, status: "SUBMITTED", scores: { create: scoreData } },
      });
    }
  },

  /** Principal formally signs and confirms the appraisal (locks it). */
  async signOff(ctx: Ctx, staffId: string, byName: string): Promise<void> {
    if (!canManage(ctx.role, "appraisals")) throw new ServiceError("Only the owner or principal signs off appraisals.");
    const { session, term } = await calendar(ctx.schoolId);
    const existing = await prisma.appraisal.findFirst({ where: { schoolId: ctx.schoolId, subjectStaffId: staffId, raterRole: "signoff", session, term } });
    if (existing) await prisma.appraisal.update({ where: { id: existing.id }, data: { comment: byName, status: "SIGNED", raterStaffId: ctx.staffId } });
    else await prisma.appraisal.create({ data: { schoolId: ctx.schoolId, subjectStaffId: staffId, raterStaffId: ctx.staffId, raterRole: "signoff", session, term, comment: byName, status: "SIGNED" } });
  },

  /** Reopen a signed-off appraisal (removes the sign-off). */
  async reopen(ctx: Ctx, staffId: string): Promise<void> {
    if (!canManage(ctx.role, "appraisals")) throw new ServiceError("Only the owner or principal reopens appraisals.");
    const { session, term } = await calendar(ctx.schoolId);
    await prisma.appraisal.deleteMany({ where: { schoolId: ctx.schoolId, subjectStaffId: staffId, raterRole: "signoff", session, term } });
  },
};
