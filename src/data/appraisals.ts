/* Staff appraisal domain — a 360° performance appraisal cycle for schools.
   Every teacher is rated across weighted competencies by four rater groups
   (self, peers, head/supervisor, principal). The principal formally signs off.
   Seeded baseline data makes the page realistic; the store overlays real edits. */

import { STAFF, seedFrom, type Staff } from "./people";

export const APPRAISAL_CYCLE = "Third Term · 2025/2026";

/** What teachers are appraised on. Weights sum to 1.0. */
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

/** Who appraises, and how much each voice counts toward the final score. */
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

export const STATUS_META: Record<Appraisal["status"], { label: string; tone: "green" | "amber" | "red" | "neutral" }> = {
  not_started: { label: "Not started", tone: "neutral" },
  self: { label: "Self done", tone: "neutral" },
  in_review: { label: "Peer review", tone: "amber" },
  awaiting_principal: { label: "Awaiting principal", tone: "amber" },
  signed_off: { label: "Signed off", tone: "green" },
};

function rng(seed: string) {
  let a = seedFrom(seed);
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COMMENTS: Record<RaterId, string[]> = {
  self: [
    "I focused on more interactive lessons this term and improved my use of teaching aids. I would like more time for marking.",
    "A demanding but rewarding term. I supported weaker pupils after class and saw their confidence grow.",
    "I met most of my targets and covered the scheme of work fully. Next term I will work on differentiated tasks.",
  ],
  peer: [
    "A supportive colleague who shares resources freely and always volunteers for duties.",
    "Collaborates well on schemes of work and is willing to cover lessons at short notice.",
    "Calm and organised; pupils respond well. Could involve the wider team a little more.",
  ],
  head: [
    "Consistently delivers well-structured lessons. Observed strong questioning technique — should mentor newer staff next term.",
    "Good subject command and orderly classroom. Lesson notes need to be submitted earlier in the week.",
    "Dependable and punctual. Results are trending up; encourage more use of data to target weak topics.",
  ],
  principal: [
    "A dependable member of staff whose performance meets the school's standards. Recommended for confirmation.",
    "Strong term overall. Commended for commitment to pupils. Agreed development goals for next session.",
    "Performance is satisfactory with clear strengths. We will support the noted areas for growth.",
  ],
};

function raterNames(s: Staff): Record<RaterId, string> {
  const principal = "Mrs. Ifeoma Okeke";
  const leader = s.role === "Principal" || s.role === "Owner";
  return {
    self: s.name,
    peer: "Peer panel · 3 colleagues",
    head: leader ? "Board / Proprietor" : s.role === "HOD" ? `${principal} (Principal)` : "Head Teacher",
    principal: leader ? "Board / Proprietor" : `${principal} (Principal)`,
  };
}

export type RaterEntry = { ratings: Record<string, number>; comment: string; by: string; date: string };

function seedEntry(s: Staff, rater: RaterId, base: number): RaterEntry {
  const r = rng(s.id + ":" + rater);
  const bias = rater === "self" ? 0.45 : rater === "head" ? -0.25 : rater === "principal" ? -0.1 : 0;
  const ratings: Record<string, number> = {};
  COMPETENCIES.forEach((c) => {
    const v = base + bias + (r() * 1.5 - 0.75);
    ratings[c.id] = Math.max(1, Math.min(5, Math.round(v)));
  });
  const pool = COMMENTS[rater];
  return { ratings, comment: pool[Math.floor(r() * pool.length)], by: raterNames(s)[rater], date: APPRAISAL_CYCLE };
}

type SeedAppraisal = {
  self: RaterEntry;
  peer: RaterEntry | null;
  head: RaterEntry | null;
  principal: RaterEntry | null;
  signed: { by: string; date: string } | null;
};

/** Deterministic baseline so the cycle looks live; spread across workflow stages. */
function seededAppraisal(s: Staff): SeedAppraisal {
  const base = 3 + rng(s.id + ":base")() * 1.6; // 3.0 .. 4.6
  const stage = rng(s.id + ":stage")();
  const self = seedEntry(s, "self", base);
  if (stage < 0.12) return { self, peer: null, head: null, principal: null, signed: null };
  const peer = seedEntry(s, "peer", base);
  if (stage < 0.3) return { self, peer, head: null, principal: null, signed: null };
  const head = seedEntry(s, "head", base);
  if (stage < 0.62) return { self, peer, head, principal: null, signed: null };
  const principal = seedEntry(s, "principal", base);
  return { self, peer, head, principal, signed: { by: raterNames(s).principal, date: "14 Jul 2026" } };
}

/** Persisted, user-entered overlay on the seeded baseline. */
export type AppraisalOverride = {
  entries?: Partial<Record<RaterId, RaterEntry>>;
  signed?: { by: string; date: string } | null;
  reopened?: boolean;
};

export type CompRow = { id: string; label: string; weight: number; scores: Record<RaterId, number | null>; weighted: number | null };
export type Appraisal = {
  staff: Staff;
  entries: Record<RaterId, RaterEntry | null>;
  perComp: CompRow[];
  overall: number | null;
  band: { label: string; tone: "green" | "amber" | "red" } | null;
  status: "not_started" | "self" | "in_review" | "awaiting_principal" | "signed_off";
  signed: { by: string; date: string } | null;
  completion: number; // raters done, 0..4
  strengths: string[];
  growth: string[];
};

export function buildAppraisal(s: Staff, ov?: AppraisalOverride): Appraisal {
  const seed = seededAppraisal(s);
  const entries: Record<RaterId, RaterEntry | null> = {
    self: ov?.entries?.self ?? seed.self,
    peer: ov?.entries?.peer ?? seed.peer,
    head: ov?.entries?.head ?? seed.head,
    principal: ov?.entries?.principal ?? seed.principal,
  };
  const signed = ov?.reopened ? null : ov?.signed ?? seed.signed;

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
  const status: Appraisal["status"] = signed
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
  const growth = ranked
    .slice(-2)
    .filter((p) => (p.weighted ?? 5) < 3.5)
    .map((p) => p.label);

  return { staff: s, entries, perComp, overall, band, status, signed, completion, strengths, growth };
}

export function appraisalSummary(get: (id: string) => AppraisalOverride | undefined) {
  const all = STAFF.map((s) => buildAppraisal(s, get(s.id)));
  const signed = all.filter((a) => a.status === "signed_off").length;
  const awaiting = all.filter((a) => a.status === "awaiting_principal").length;
  const inProgress = all.filter((a) => a.status === "self" || a.status === "in_review").length;
  const scored = all.filter((a) => a.overall != null);
  const avg = scored.length ? Math.round((scored.reduce((t, a) => t + (a.overall ?? 0), 0) / scored.length) * 100) / 100 : 0;
  return { all, signed, awaiting, inProgress, avg, total: STAFF.length };
}
