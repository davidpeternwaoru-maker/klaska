/* Staff appraisal domain config — the competencies, rater groups, scale and the
   pure scoring computation. No mock/seed data: real entries come from the DB.
   Shared by the appraisals page, the server loader/actions, and the exporters. */

export const COMPETENCIES = [
  { id: "delivery", label: "Teaching & lesson delivery", weight: 0.18, hint: "Clarity, pace, engagement, use of teaching aids" },
  { id: "mastery", label: "Subject mastery & planning", weight: 0.15, hint: "Command of subject, schemes of work, lesson notes" },
  { id: "management", label: "Classroom management", weight: 0.14, hint: "Discipline, learning climate, inclusion of all pupils" },
  { id: "results", label: "Student progress & results", weight: 0.16, hint: "Impact on learning outcomes & assessment scores" },
  { id: "punctuality", label: "Punctuality & attendance", weight: 0.1, hint: "Lateness, absence, lesson coverage" },
  { id: "conduct", label: "Professionalism & conduct", weight: 0.12, hint: "Ethics, role-modelling, adherence to policy" },
  { id: "teamwork", label: "Teamwork & collaboration", weight: 0.08, hint: "Support for colleagues, school events & duties" },
  { id: "communication", label: "Communication", weight: 0.07, hint: "With parents, pupils & colleagues; reporting" },
] as const;
export type CompId = (typeof COMPETENCIES)[number]["id"];

export const RATERS = [
  { id: "self", label: "Self-appraisal", weight: 0.1, icon: "students", note: "The teacher reflects on their own term" },
  { id: "peer", label: "Peer review", weight: 0.2, icon: "students", note: "Fellow teachers appraise each other" },
  { id: "head", label: "Head / supervisor", weight: 0.4, icon: "badge", note: "Head teacher or HOD observation" },
  { id: "principal", label: "Principal", weight: 0.3, icon: "check", note: "Formal review & sign-off" },
] as const;
export type RaterId = (typeof RATERS)[number]["id"];

export const SCALE = [
  { v: 1, label: "Needs improvement", tone: "red" },
  { v: 2, label: "Developing", tone: "amber" },
  { v: 3, label: "Meets expectations", tone: "amber" },
  { v: 4, label: "Exceeds expectations", tone: "green" },
  { v: 5, label: "Outstanding", tone: "green" },
] as const;

export function bandOfScore(v: number): { label: string; tone: "green" | "amber" | "red" } {
  if (v >= 4.5) return { label: "Outstanding", tone: "green" };
  if (v >= 3.5) return { label: "Exceeds expectations", tone: "green" };
  if (v >= 2.5) return { label: "Meets expectations", tone: "amber" };
  if (v >= 1.5) return { label: "Developing", tone: "amber" };
  return { label: "Needs improvement", tone: "red" };
}

export type AppraisalStatus = "not_started" | "self" | "in_review" | "awaiting_principal" | "signed_off";

export const STATUS_META: Record<AppraisalStatus, { label: string; tone: "green" | "amber" | "red" | "neutral" }> = {
  not_started: { label: "Not started", tone: "neutral" },
  self: { label: "Self done", tone: "neutral" },
  in_review: { label: "Peer review", tone: "amber" },
  awaiting_principal: { label: "Awaiting principal", tone: "amber" },
  signed_off: { label: "Signed off", tone: "green" },
};

export type RaterEntry = { ratings: Record<string, number>; comment: string; by: string; date: string };
export type CompRow = { id: string; label: string; weight: number; scores: Record<RaterId, number | null>; weighted: number | null };
export type AppraisalStaff = { id: string; name: string; role: string; department: string | null; hue: number };
export type Appraisal = {
  staff: AppraisalStaff;
  entries: Record<RaterId, RaterEntry | null>;
  perComp: CompRow[];
  overall: number | null;
  band: { label: string; tone: "green" | "amber" | "red" } | null;
  status: AppraisalStatus;
  signed: { by: string; date: string } | null;
  completion: number;
  strengths: string[];
  growth: string[];
};

/** A sensible byline for a rater group (we don't store it — derive it). */
export function raterByline(staff: AppraisalStaff, r: RaterId, principalName: string): string {
  const leader = staff.role === "HOS" || staff.role === "OWNER";
  if (r === "self") return staff.name;
  if (r === "peer") return "Peer panel · colleagues";
  if (r === "head") return leader ? "Board / Proprietor" : staff.role === "HOD" ? `${principalName} (Principal)` : "Head Teacher / HOD";
  return leader ? "Board / Proprietor" : `${principalName} (Principal)`;
}

/** Compute the full appraisal (per-competency weighted scores, overall, band,
 *  status, strengths/growth) from whatever rater entries exist. Pure. */
export function buildAppraisal(staff: AppraisalStaff, entries: Record<RaterId, RaterEntry | null>, signed: { by: string; date: string } | null): Appraisal {
  const perComp: CompRow[] = COMPETENCIES.map((c) => {
    const scores: Record<RaterId, number | null> = { self: null, peer: null, head: null, principal: null };
    let wsum = 0;
    let w = 0;
    RATERS.forEach((rt) => {
      const v = entries[rt.id]?.ratings[c.id];
      if (v != null) {
        scores[rt.id] = v;
        wsum += v * rt.weight;
        w += rt.weight;
      }
    });
    return { id: c.id, label: c.label, weight: c.weight, scores, weighted: w ? Math.round((wsum / w) * 10) / 10 : null };
  });

  const haveAny = perComp.some((p) => p.weighted != null);
  const overall = haveAny ? Math.round(perComp.reduce((t, p) => t + (p.weighted ?? 0) * p.weight, 0) * 100) / 100 : null;
  const band = overall != null ? bandOfScore(overall) : null;
  const completion = RATERS.filter((rt) => entries[rt.id]).length;
  const status: AppraisalStatus = signed
    ? "signed_off"
    : entries.head
      ? "awaiting_principal"
      : entries.peer
        ? "in_review"
        : entries.self
          ? "self"
          : "not_started";

  const ranked = [...perComp].filter((p) => p.weighted != null).sort((a, b) => (b.weighted ?? 0) - (a.weighted ?? 0));
  const strengths = ranked.slice(0, 2).map((p) => p.label);
  const growth = ranked.slice(-2).filter((p) => (p.weighted ?? 5) < 3.5).map((p) => p.label);

  return { staff, entries, perComp, overall, band, status, signed, completion, strengths, growth };
}
