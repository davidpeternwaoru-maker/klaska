"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { canView, canManage } from "@/lib/auth/permissions";
import type { RaterId } from "@/lib/appraisals/config";

type Res = { ok?: true; error?: string };

async function calendar(schoolId: string) {
  const s = await prisma.school.findUnique({ where: { id: schoolId }, select: { session: true, term: true } });
  return { session: s?.session ?? null, term: s?.term ?? null };
}

/** Record (or update) one rater group's competency scores + comment for a staff member. */
export async function saveRatingAction(staffId: string, rater: RaterId, ratings: Record<string, number>, comment: string): Promise<Res> {
  const user = await requireUser();
  if (!canView(user.role, "appraisals")) return { error: "You don't have access to appraisals." };
  // Teachers may only submit their OWN self-appraisal.
  if (user.role === "TEACHER" && (rater !== "self" || staffId !== user.staffId)) return { error: "Teachers can only submit their own self-appraisal." };

  const { session, term } = await calendar(user.schoolId);
  const vals = Object.values(ratings);
  // Denormalised summary only (the precise weighted score is always recomputed
  // from the AppraisalScore rows on read). `overall` is an Int? column, so store
  // a rounded 1–5 average rather than passing a float we'd silently truncate.
  const overall = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  const scoreData = Object.entries(ratings).map(([competency, score]) => ({ competency, score: Math.max(1, Math.min(5, Math.round(score))) }));

  const existing = await prisma.appraisal.findFirst({ where: { schoolId: user.schoolId, subjectStaffId: staffId, raterRole: rater, session, term } });
  if (existing) {
    await prisma.$transaction([
      prisma.appraisalScore.deleteMany({ where: { appraisalId: existing.id } }),
      prisma.appraisal.update({ where: { id: existing.id }, data: { comment, overall, raterStaffId: user.staffId, status: "SUBMITTED", scores: { create: scoreData } } }),
    ]);
  } else {
    await prisma.appraisal.create({ data: { schoolId: user.schoolId, subjectStaffId: staffId, raterStaffId: user.staffId, raterRole: rater, session, term, comment, overall, status: "SUBMITTED", scores: { create: scoreData } } });
  }
  revalidatePath("/people/appraisals");
  return { ok: true };
}

/** Principal formally signs and confirms the appraisal (locks it). */
export async function signOffAction(staffId: string, byName: string): Promise<Res> {
  const user = await requireUser();
  if (!canManage(user.role, "appraisals")) return { error: "Only the owner or principal signs off appraisals." };
  const { session, term } = await calendar(user.schoolId);
  const existing = await prisma.appraisal.findFirst({ where: { schoolId: user.schoolId, subjectStaffId: staffId, raterRole: "signoff", session, term } });
  if (existing) await prisma.appraisal.update({ where: { id: existing.id }, data: { comment: byName, status: "SIGNED", raterStaffId: user.staffId } });
  else await prisma.appraisal.create({ data: { schoolId: user.schoolId, subjectStaffId: staffId, raterStaffId: user.staffId, raterRole: "signoff", session, term, comment: byName, status: "SIGNED" } });
  revalidatePath("/people/appraisals");
  return { ok: true };
}

/** Reopen a signed-off appraisal (removes the sign-off). */
export async function reopenAction(staffId: string): Promise<Res> {
  const user = await requireUser();
  if (!canManage(user.role, "appraisals")) return { error: "Only the owner or principal reopens appraisals." };
  const { session, term } = await calendar(user.schoolId);
  await prisma.appraisal.deleteMany({ where: { schoolId: user.schoolId, subjectStaffId: staffId, raterRole: "signoff", session, term } });
  revalidatePath("/people/appraisals");
  return { ok: true };
}
