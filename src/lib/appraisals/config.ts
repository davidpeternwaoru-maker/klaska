/* Teacher-appraisal domain config — the criteria, the three reviewer perspectives,
   the 1–5 scale and the pure scoring computation. No mock/seed data: real entries
   come from the DB. Shared by the appraisals page, the server loader/actions and
   the export builder.

   The model: each teacher is appraised on the SAME record from up to three
   perspectives — their own self-appraisal, their HOD's, and the HOS/Principal's.
   Each perspective rates the six criteria 1–5 (with an optional per-section note)
   and adds one overall comment. A perspective's overall = the mean of its six
   scores. The record's combined overall = the mean of the perspectives present. */

export const COMPETENCIES = [
  { id: "delivery", label: "Teaching delivery & effectiveness", hint: "Clarity, pace, engagement, mastery of the subject" },
  { id: "punctuality", label: "Punctuality & attendance", hint: "Lateness, absence, reliable lesson coverage" },
  { id: "results", label: "Student results & performance", hint: "Impact on learning outcomes in their subjects" },
  { id: "planning", label: "Lesson notes & scheme of work", hint: "Timely, complete submission of notes and schemes" },
  { id: "management", label: "Classroom management & conduct", hint: "Discipline, learning climate, control of the class" },
  { id: "conduct", label: "Professional conduct & teamwork", hint: "Ethics, collaboration, punctual duties, teamwork" },
] as const;
export type CompId = (typeof COMPETENCIES)[number]["id"];
export const COMP_IDS = COMPETENCIES.map((c) => c.id) as CompId[];

// The three perspectives that appraise one teacher. Stored in Appraisal.raterRole.
export const RATERS = [
  { id: "self", label: "Self-appraisal", who: "The teacher", icon: "students", note: "The teacher reflects on their own term" },
  { id: "hod", label: "HOD appraisal", who: "Head of Department", icon: "badge", note: "Their head of department's assessment" },
  { id: "hos", label: "Principal appraisal", who: "Principal / HOS", icon: "check", note: "School leadership's assessment" },
] as const;
export type RaterId = (typeof RATERS)[number]["id"];
export const RATER_IDS: RaterId[] = RATERS.map((r) => r.id);
export const RATER_LABEL: Record<RaterId, string> = { self: "Self", hod: "HOD", hos: "Principal" };

export const SCALE = [
  { v: 1, label: "Needs improvement", tone: "red" },
  { v: 2, label: "Developing", tone: "amber" },
  { v: 3, label: "Meets expectations", tone: "amber" },
  { v: 4, label: "Exceeds expectations", tone: "green" },
  { v: 5, label: "Outstanding", tone: "green" },
] as const;

export type Tone = "green" | "amber" | "red";
export function bandOfScore(v: number): { label: string; tone: Tone } {
  if (v >= 4.5) return { label: "Outstanding", tone: "green" };
  if (v >= 3.5) return { label: "Exceeds expectations", tone: "green" };
  if (v >= 2.5) return { label: "Meets expectations", tone: "amber" };
  if (v >= 1.5) return { label: "Developing", tone: "amber" };
  return { label: "Needs improvement", tone: "red" };
}

export type Progress = "done" | "draft" | "pending";

// One reviewer's completed (or draft) portion.
export type RaterEntry = {
  rater: RaterId;
  sections: Record<string, { score: number | null; comment: string }>;
  overall: number | null; // mean of the six section scores
  comment: string; // the overall comment
  status: "DRAFT" | "SUBMITTED";
  by: string; // reviewer's name
  date: string;
};

// A row in the side-by-side table: one criterion, each perspective's score.
export type CompRow = { id: CompId; label: string; hint: string; scores: Record<RaterId, number | null> };

export type AppraisalStaff = { id: string; name: string; role: string; department: string | null; hue: number };

export type Appraisal = {
  staff: AppraisalStaff;
  entries: Record<RaterId, RaterEntry | null>;
  perComp: CompRow[];
  overall: number | null; // mean of the perspectives present
  band: { label: string; tone: Tone } | null;
  progress: Record<RaterId, Progress>; // "Self: done · HOD: pending · HOS: draft"
  /** Which perspective the *current viewer* may fill for THIS teacher (set by the
   *  read layer from the viewer's role/dept). null = read-only for this viewer. */
  editableRater: RaterId | null;
};

/** Mean of a perspective's section scores, to 2 dp, or null if none. */
export function overallOf(sections: Record<string, { score: number | null; comment: string }>): number | null {
  const vals = COMP_IDS.map((id) => sections[id]?.score).filter((v): v is number => v != null);
  return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : null;
}

/** Compute the full appraisal (side-by-side rows, combined overall, band, progress)
 *  from whatever reviewer entries exist. Pure — no I/O. */
export function buildAppraisal(staff: AppraisalStaff, entries: Record<RaterId, RaterEntry | null>): Appraisal {
  const perComp: CompRow[] = COMPETENCIES.map((c) => {
    const scores: Record<RaterId, number | null> = { self: null, hod: null, hos: null };
    RATER_IDS.forEach((r) => {
      scores[r] = entries[r]?.sections[c.id]?.score ?? null;
    });
    return { id: c.id, label: c.label, hint: c.hint, scores };
  });

  const overalls = RATER_IDS.map((r) => entries[r]?.overall).filter((v): v is number => v != null);
  const overall = overalls.length ? Math.round((overalls.reduce((a, b) => a + b, 0) / overalls.length) * 100) / 100 : null;
  const band = overall != null ? bandOfScore(overall) : null;

  const progress = Object.fromEntries(
    RATER_IDS.map((r) => {
      const e = entries[r];
      return [r, e ? (e.status === "SUBMITTED" ? "done" : "draft") : "pending"];
    }),
  ) as Record<RaterId, Progress>;

  return { staff, entries, perComp, overall, band, progress, editableRater: null };
}

/** "Self: done · HOD: pending · HOS: draft" */
export function progressLine(p: Record<RaterId, Progress>): string {
  const word: Record<Progress, string> = { done: "done", draft: "in draft", pending: "pending" };
  return RATER_IDS.map((r) => `${RATER_LABEL[r]}: ${word[p[r]]}`).join(" · ");
}
