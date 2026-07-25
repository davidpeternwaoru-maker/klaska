import "server-only";

// Appraisals (writes) — record ONE reviewer perspective's scores + comments for a
// teacher, in the current session/term. Exactly one Appraisal row per
// (subjectStaffId, raterRole, session, term). Every rule below is enforced here,
// on the server, regardless of what the UI shows:
//
//   • A Teacher may fill ONLY their own self-appraisal.
//   • A HOD may fill the HOD portion ONLY for teachers in their own department,
//     and may fill their own self-appraisal.
//   • The HOS/Principal may fill the Principal portion for anyone.
//   • The Owner is read-only (full visibility, no input).
//   • Submitting locks that reviewer's portion; a DRAFT can still be edited.

import { prisma } from "@/lib/db";
import { canView } from "@/lib/auth/permissions";
import { editableRaterFor } from "@/lib/appraisals";
import { COMP_IDS, overallOf, type RaterId } from "@/lib/appraisals/config";
import { type Ctx, ServiceError } from "@/server/context";

async function calendar(schoolId: string) {
  const s = await prisma.school.findUnique({ where: { id: schoolId }, select: { session: true, term: true } });
  return { session: s?.session ?? null, term: s?.term ?? null };
}

export type SectionInput = { competency: string; score: number; comment?: string };

export const appraisalsService = {
  /** Record (or update) one reviewer's portion. `submit` locks it; otherwise it
   *  stays an editable DRAFT. Returns nothing; throws ServiceError on any denial. */
  async saveRating(ctx: Ctx, staffId: string, rater: RaterId, sections: SectionInput[], overallComment: string, submit: boolean): Promise<void> {
    if (!canView(ctx.role, "appraisals")) throw new ServiceError("You don't have access to appraisals.");

    const [viewer, subject] = await Promise.all([
      prisma.staff.findUnique({ where: { id: ctx.staffId }, select: { departmentId: true } }),
      prisma.staff.findFirst({ where: { id: staffId, schoolId: ctx.schoolId }, select: { id: true, role: true, departmentId: true } }),
    ]);
    if (!subject) throw new ServiceError("That staff member was not found.", "NOT_FOUND");

    // The single source of truth for "who may fill what" — shared with the reads.
    const allowed = editableRaterFor(
      { role: ctx.role, staffId: ctx.staffId, departmentId: viewer?.departmentId ?? null },
      { id: subject.id, role: subject.role, departmentId: subject.departmentId },
    );
    if (!allowed) throw new ServiceError("You are not allowed to appraise this teacher.");
    if (allowed !== rater) throw new ServiceError(`Your role may only record the ${allowed.toUpperCase()} appraisal here.`);

    const { session, term } = await calendar(ctx.schoolId);

    // Sanitise: known competencies only, scores clamped to 1–5.
    const clean = sections
      .filter((s) => (COMP_IDS as string[]).includes(s.competency))
      .map((s) => ({ competency: s.competency, score: Math.max(1, Math.min(5, Math.round(s.score))), comment: (s.comment ?? "").trim() || null }));
    if (submit && clean.length < COMP_IDS.length) throw new ServiceError("Please rate every criterion before submitting.", "INVALID");

    const overall = overallOf(Object.fromEntries(clean.map((c) => [c.competency, { score: c.score, comment: c.comment ?? "" }])));
    const status = submit ? "SUBMITTED" : "DRAFT";

    const existing = await prisma.appraisal.findFirst({ where: { schoolId: ctx.schoolId, subjectStaffId: staffId, raterRole: rater, session, term } });
    if (existing) {
      if (existing.status === "SUBMITTED") throw new ServiceError("This portion has already been submitted and is locked.");
      await prisma.$transaction([
        prisma.appraisalScore.deleteMany({ where: { appraisalId: existing.id } }),
        prisma.appraisal.update({
          where: { id: existing.id },
          data: { comment: overallComment.trim() || null, overall, raterStaffId: ctx.staffId, status, scores: { create: clean } },
        }),
      ]);
    } else {
      await prisma.appraisal.create({
        data: { schoolId: ctx.schoolId, subjectStaffId: staffId, raterStaffId: ctx.staffId, raterRole: rater, session, term, comment: overallComment.trim() || null, overall, status, scores: { create: clean } },
      });
    }
  },
};
