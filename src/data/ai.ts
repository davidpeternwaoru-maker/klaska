/* AI Outcomes Engine — three age-banded views computed from live data:
   Early Years (developmental milestones), Upper Primary (Common Entrance/BECE
   readiness) and Secondary (WAEC/NECO/BECE exam-readiness intelligence). */

import { activeStudents, getAcademics, getAttendance, niceClass, seedFrom, type Student } from "./people";

function rng(seed: string) {
  let a = seedFrom(seed);
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LEVEL_AGE: Record<string, number> = {
  "Crèche": 3, "KG 1": 4, "KG 2": 5, "Nursery 1": 5, "Nursery 2": 6,
  "Primary 1": 6, "Primary 2": 7, "Primary 3": 8, "Primary 4": 9, "Primary 5": 10, "Primary 6": 11,
  "JSS 1": 12, "JSS 2": 13, "JSS 3": 14, "SSS 1": 15, "SSS 2": 16, "SSS 3": 17,
};
export const ageOf = (s: Student) => LEVEL_AGE[s.level] ?? 12;
const active = () => activeStudents();
const isEarly = (lvl: string) => /^(Crèche|KG|Nursery)/.test(lvl) || lvl === "Primary 1" || lvl === "Primary 2";
const isUpper = (lvl: string) => ["Primary 3", "Primary 4", "Primary 5", "Primary 6"].includes(lvl);
const isExam = (lvl: string) => ["JSS 3", "SSS 2", "SSS 3"].includes(lvl);

/* ====================== EARLY YEARS ====================== */
export const EY_SKILLS = [
  { key: "Literacy", label: "Literacy & Language", icon: "book" },
  { key: "Numeracy", label: "Numeracy", icon: "reports" },
  { key: "Social", label: "Social & Emotional", icon: "students" },
  { key: "Physical", label: "Physical & Motor", icon: "sparkle" },
  { key: "Behaviour", label: "Behaviour & Independence", icon: "check" },
] as const;
const EY_PROB: Record<string, number> = { Literacy: 0.7, Numeracy: 0.71, Social: 0.72, Physical: 0.71, Behaviour: 0.72 };

export function earlyYearsData() {
  const kids = active().filter((s) => isEarly(s.level));
  const enriched = kids.map((s) => {
    const r = rng(s.id + ":ey");
    const skills = EY_SKILLS.map((sk) => ({ key: sk.key, onMilestone: r() < EY_PROB[sk.key] }));
    const weak = skills.filter((x) => !x.onMilestone).map((x) => x.key);
    return { s, skills, weak, met: skills.filter((x) => x.onMilestone).length };
  });
  const total = enriched.length || 1;
  const perSkill = EY_SKILLS.map((sk) => {
    const on = enriched.filter((e) => e.skills.find((x) => x.key === sk.key)?.onMilestone).length;
    return { ...sk, pct: Math.round((on / total) * 100), toSupport: total - on };
  });
  const toWatch = enriched.filter((e) => e.weak.length > 0).sort((a, b) => a.met - b.met);
  const thriving = enriched.length - toWatch.length;
  const onMilestonePct = Math.round(perSkill.reduce((a, p) => a + p.pct, 0) / perSkill.length);

  const suggestions = [
    { icon: "book", tone: "amber", title: "Literacy circle time", body: `${perSkill[0].toSupport} children are building letter sounds. Add a daily 10-min phonics song & picture-book session in Nursery 2 and KG 1.` },
    { icon: "reports", tone: "green", title: "Counting through play", body: `Use snack-time counting and number puzzles for the ${perSkill[1].toSupport} children developing numeracy. Most are nearly there.` },
    { icon: "students", tone: "red", title: "Buddy play for 2 shy children", body: "Pair them with a confident peer during free play to build social confidence. Share a note with parents." },
  ];

  return { count: enriched.length, toWatch, thriving, onMilestonePct, perSkill, suggestions };
}

/* ====================== UPPER PRIMARY ====================== */
export function upperPrimaryData() {
  const pupils = active().filter((s) => isUpper(s.level));
  const enriched = pupils.map((s) => {
    const a = getAcademics(s);
    const avg = a.kind === "academic" ? a.average : 60;
    const r = rng(s.id + ":up");
    const readiness = Math.min(95, Math.max(35, Math.round(avg * 0.75 + 12 + (r() * 10 - 5))));
    const pathway = s.level === "Primary 6" ? "Common Entrance" : r() > 0.5 ? "Placement" : "Common Entrance";
    const weak = a.kind === "academic" ? a.subjects.filter((x) => x.total < 55).map((x) => x.subject) : [];
    const cat = readiness >= 70 ? "on" : readiness >= 50 ? "border" : "risk";
    return { s, readiness, pathway, weak: weak.slice(0, 2), cat };
  });
  const avgReadiness = enriched.length ? Math.round(enriched.reduce((a, p) => a + p.readiness, 0) / enriched.length) : 0;
  const counts = { on: enriched.filter((e) => e.cat === "on").length, border: enriched.filter((e) => e.cat === "border").length, risk: enriched.filter((e) => e.cat === "risk").length };

  const byClassMap: Record<string, number[]> = {};
  enriched.forEach((e) => (byClassMap[e.s.level] = byClassMap[e.s.level] || []).push(e.readiness));
  const byClass = ["Primary 3", "Primary 4", "Primary 5", "Primary 6"]
    .filter((l) => byClassMap[l])
    .map((l) => ({ level: l, n: byClassMap[l].length, pct: Math.round(byClassMap[l].reduce((a, b) => a + b, 0) / byClassMap[l].length) }));

  const recommended = [
    { icon: "book", tone: "red", title: "Comprehension drills — Primary 6", body: "9 pupils below 50% on English comprehension. Klaska prepared a 2-week worksheet pack for the teacher to hand out." },
    { icon: "reports", tone: "amber", title: "Quantitative reasoning clinic", body: "Primary 5 needs number-pattern practice before Common Entrance. Suggested 3 short sessions a week." },
    { icon: "trend", tone: "green", title: "Primary 4 trending up", body: "Verbal reasoning scores climbing steadily — current pace puts most on track for placement." },
  ];

  return { count: enriched.length, avgReadiness, counts, byClass, recommended, list: [...enriched].sort((a, b) => a.readiness - b.readiness) };
}

/* ====================== SECONDARY ====================== */
const EXAM_OF: Record<string, string> = { "JSS 3": "BECE", "SSS 2": "WAEC mock", "SSS 3": "WAEC/NECO" };
const shortSubj: Record<string, string> = { "Basic Science": "Bas. Sci", Mathematics: "Maths", "Social Studies": "Soc. Std", "Civic Education": "Civic", Computer: "Computer", English: "English", Physics: "Physics", Chemistry: "Chemistry", Biology: "Biology", Economics: "Economics" };

export type ExamStudent = {
  s: Student;
  klass: string;
  exam: string;
  predicted: number;
  weak: { subject: string; score: number }[];
  cat: "on" | "border" | "risk";
};

export function examStudents(): ExamStudent[] {
  return active()
    .filter((s) => isExam(s.level))
    .map((s) => {
      const a = getAcademics(s);
      if (a.kind !== "academic") return null;
      const att = getAttendance(s);
      const j = rng(s.id + ":pj")();
      const predicted = Math.min(96, Math.max(38, Math.round(a.average - 4 + (att.rate - 85) * 0.2 + (j * 22 - 11))));
      const weak = a.subjects.filter((x) => x.total < 55).map((x) => ({ subject: shortSubj[x.subject] ?? x.subject, score: x.total })).slice(0, 3);
      const cat = predicted >= 65 ? "on" : predicted >= 50 ? "border" : "risk";
      return { s, klass: niceClass(s), exam: EXAM_OF[s.level], predicted, weak, cat };
    })
    .filter(Boolean) as ExamStudent[];
}

export function secondaryData() {
  const list = examStudents();
  const counts = { on: list.filter((e) => e.cat === "on").length, border: list.filter((e) => e.cat === "border").length, risk: list.filter((e) => e.cat === "risk").length };
  const total = list.length || 1;
  const predictedPass = Math.round((counts.on / total) * 100);

  const predictedVsTarget = [
    { t: "T1 24/25", pred: Math.max(60, predictedPass - 12), target: 85 },
    { t: "T2 24/25", pred: Math.max(62, predictedPass - 9), target: 85 },
    { t: "T3 24/25", pred: Math.max(64, predictedPass - 6), target: 85 },
    { t: "T1 25/26", pred: Math.max(66, predictedPass - 3), target: 85 },
    { t: "T2 25/26", pred: predictedPass, target: 85 },
  ];

  const insights = [
    { icon: "alert", tone: "red", title: "English is the biggest exam risk", body: `SSS 2 English has the lowest predicted scores. ${counts.border} students fall below 50%.` },
    { icon: "trend", tone: "green", title: "Maths is improving fast", body: "SSS 3 Mathematics up 9 points since CA1 — peer-tutoring is working." },
    { icon: "clock", tone: "amber", title: "Attendance is dragging 6 students", body: "Low attenders in JSS 3B are predicted 12 points below their CA average." },
  ];

  const byClassMap: Record<string, ExamStudent[]> = {};
  list.forEach((e) => (byClassMap[e.klass] = byClassMap[e.klass] || []).push(e));
  const byExamClass = Object.entries(byClassMap)
    .map(([klass, arr]) => ({
      klass,
      exam: arr[0].exam,
      on: arr.filter((x) => x.cat === "on").length,
      border: arr.filter((x) => x.cat === "border").length,
      risk: arr.filter((x) => x.cat === "risk").length,
      pass: Math.round((arr.filter((x) => x.cat === "on").length / arr.length) * 100),
    }))
    .sort((a, b) => a.klass.localeCompare(b.klass));

  // interventions for borderline / at-risk
  const TOPICS: Record<string, string[]> = {
    "Bas. Sci": ["Energy", "Matter & its properties"], Maths: ["Quadratic equations", "Mensuration"], English: ["Comprehension", "Essay structure"],
    Physics: ["Waves", "Electricity"], Chemistry: ["Mole concept", "Acids & bases"], Biology: ["Genetics", "Ecology"], Economics: ["Demand & supply", "National income"],
    "Soc. Std": ["Citizenship", "Culture"], Civic: ["Rights & duties"], Computer: ["Spreadsheets", "Algorithms"],
  };
  const interventions = list
    .filter((e) => e.cat !== "on" && e.weak.length)
    .slice(0, 12)
    .map((e) => {
      const w = e.weak[0];
      const r = rng(e.s.id + ":iv");
      return {
        s: e.s,
        klass: e.klass,
        exam: e.exam,
        predicted: e.predicted,
        cat: e.cat,
        weakArea: w,
        topics: (TOPICS[w.subject] ?? ["Core revision"]).slice(0, 2),
        action: r() > 0.5 ? "Assign targeted practice set + weekly drill" : "Small-group remedial class (Tue/Thu, 3–4 PM)",
        gain: 7 + Math.floor(r() * 4),
      };
    });

  const headline = counts.border + counts.risk;
  return { list, counts, predictedPass, predictedVsTarget, insights, byExamClass, interventions, headline };
}
