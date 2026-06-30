/* Academics domain — analysis & AI risk, computed live from the student data.
   Departments are referenced by stable IDs; display names come from config. */

import { activeStudents, getAcademics, getAttendance, niceClass, bandOf, seedFrom, LEVELS, type Student } from "./people";
import { getDepartments, getDeptName } from "@/lib/config/schoolConfig";

export const DEPT_IDS = ["science", "arts", "commercial"] as const;
export type DeptId = (typeof DEPT_IDS)[number];

/** Stable department id for a senior-secondary student (null otherwise). */
export const deptIdOf = (s: Student): DeptId | null => (s.level.startsWith("SSS") ? DEPT_IDS[seedFrom(s.id + ":d") % 3] : null);

export type SubjectScore = { subject: string; ca1: number; ca2: number; exam: number; total: number; grade: string };
export type Scored = {
  s: Student;
  klass: string;
  average: number;
  prev: number;
  delta: number;
  subjects: SubjectScore[];
  deptId: DeptId | null;
};

/** Active students with academic (not developmental) results. */
export function scoredStudents(): Scored[] {
  return activeStudents()
    .map((s) => {
      const a = getAcademics(s);
      if (a.kind !== "academic") return null;
      const prev = Math.max(20, a.average - (seedFrom(s.id + ":imp") % 18) - 2);
      return { s, klass: niceClass(s), average: a.average, prev, delta: a.average - prev, subjects: a.subjects, deptId: deptIdOf(s) };
    })
    .filter(Boolean) as Scored[];
}

function rank(arr: Scored[]) {
  return [...arr].sort((a, b) => b.average - a.average);
}
function subjectAverages(arr: Scored[]) {
  const subjects = arr.length ? arr[0].subjects.map((x) => x.subject) : [];
  return subjects.map((subject) => {
    const vals = arr.map((p) => p.subjects.find((y) => y.subject === subject)?.total).filter((v): v is number => v != null);
    return { subject, avg: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0 };
  });
}

export type SubjectLeader = { subject: string; name: string; hue: number; total: number };
export type DeptInClass = { id: string; name: string; best: Scored | null; avg: number; n: number };
export type ClassReport = {
  klass: string;
  ranked: Scored[];
  best: Scored;
  classAvg: number;
  subjectAvgs: { subject: string; avg: number }[];
  weakest: { subject: string; avg: number }[];
  bestPerSubject: SubjectLeader[];
  departments: DeptInClass[]; // only populated for SSS classes
};
export type DeptReport = {
  id: string;
  name: string;
  ranked: Scored[];
  best: Scored | null;
  avg: number;
  subjectAvgs: { subject: string; avg: number }[];
  n: number;
};

export function fullAnalysis() {
  const pool = scoredStudents();
  const byAvg = rank(pool);
  const bestSchool = byAvg[0] ?? null;

  // class reports
  const classMap: Record<string, Scored[]> = {};
  pool.forEach((p) => (classMap[p.klass] = classMap[p.klass] || []).push(p));
  const classReports: ClassReport[] = Object.entries(classMap)
    .map(([klass, arr]) => {
      const ranked = rank(arr);
      const subjectAvgs = subjectAverages(arr);
      const subjects = subjectAvgs.map((x) => x.subject);
      const bestPerSubject: SubjectLeader[] = subjects.map((subject) => {
        let name = "—";
        let hue = 0;
        let total = 0;
        arr.forEach((p) => {
          const f = p.subjects.find((y) => y.subject === subject);
          if (f && f.total > total) {
            total = f.total;
            name = p.s.name;
            hue = p.s.hue;
          }
        });
        return { subject, name, hue, total };
      });
      const isSSS = arr.some((p) => p.deptId != null);
      const departments: DeptInClass[] = isSSS
        ? getDepartments()
            .map((d) => {
              const da = arr.filter((p) => p.deptId === d.id);
              const dr = rank(da);
              return { id: d.id, name: d.name, best: dr[0] ?? null, avg: da.length ? Math.round(da.reduce((a, p) => a + p.average, 0) / da.length) : 0, n: da.length };
            })
            .filter((d) => d.n)
        : [];
      return {
        klass,
        ranked,
        best: ranked[0],
        classAvg: Math.round(arr.reduce((a, p) => a + p.average, 0) / arr.length),
        subjectAvgs,
        weakest: [...subjectAvgs].sort((a, b) => a.avg - b.avg).slice(0, 3),
        bestPerSubject,
        departments,
      };
    })
    .sort((a, b) => LEVELS.indexOf(a.ranked[0].s.level as never) - LEVELS.indexOf(b.ranked[0].s.level as never) || a.klass.localeCompare(b.klass));

  // department reports — iterate configured departments (so renames show)
  const deptReports: DeptReport[] = getDepartments().map((d) => {
    const arr = pool.filter((p) => p.deptId === d.id);
    const ranked = rank(arr);
    return {
      id: d.id,
      name: d.name,
      ranked,
      best: ranked[0] ?? null,
      avg: arr.length ? Math.round(arr.reduce((a, p) => a + p.average, 0) / arr.length) : 0,
      subjectAvgs: subjectAverages(arr),
      n: arr.length,
    };
  });

  // best per subject (whole school)
  const allSubjects = Array.from(new Set(pool.flatMap((p) => p.subjects.map((x) => x.subject))));
  const bestPerSubject = allSubjects.map((subject) => {
    let name = "—";
    let klass = "";
    let total = 0;
    pool.forEach((p) => {
      const f = p.subjects.find((y) => y.subject === subject);
      if (f && f.total > total) {
        total = f.total;
        name = p.s.name;
        klass = p.klass;
      }
    });
    return { subject, name, klass, total };
  });

  // most improved
  const mostImproved = [...pool].sort((a, b) => b.delta - a.delta).slice(0, 10);

  // overall subject averages
  const subjOverall = subjectAverages(pool).sort((a, b) => b.avg - a.avg);

  const schoolAvg = pool.length ? Math.round(pool.reduce((a, p) => a + p.average, 0) / pool.length) : 0;
  const passRate = pool.length ? Math.round((pool.filter((p) => p.average >= 50).length / pool.length) * 100) : 0;

  return { pool, byAvg, bestSchool, classReports, deptReports, bestPerSubject, mostImproved, subjOverall, schoolAvg, passRate };
}

export type FullAnalysis = ReturnType<typeof fullAnalysis>;

// ---------------- AI risk (unchanged) ----------------
export type Risk = {
  s: Student;
  klass: string;
  average: number;
  rate: number;
  weak: string[];
  level: "High" | "Medium" | "Low";
  score: number;
  onTrack: boolean;
};

export function studentRisk(s: Student): Risk | null {
  const a = getAcademics(s);
  if (a.kind !== "academic") return null;
  const att = getAttendance(s);
  const weak = a.subjects.filter((x) => x.total < 50).map((x) => x.subject);
  let score = 0;
  if (a.average < 45) score += 3;
  else if (a.average < 55) score += 2;
  else if (a.average < 65) score += 1;
  if (att.rate < 70) score += 2;
  else if (att.rate < 80) score += 1;
  if (weak.length >= 3) score += 2;
  else if (weak.length >= 1) score += 1;
  const level = score >= 4 ? "High" : score >= 2 ? "Medium" : "Low";
  return { s, klass: niceClass(s), average: a.average, rate: att.rate, weak, level, score, onTrack: a.average >= 50 && att.rate >= 75 };
}

export function recommend(r: Risk): string[] {
  const t: string[] = [];
  if (r.weak.length) t.push(`Targeted worksheets for ${r.weak.slice(0, 2).join(" & ")}`);
  if (r.rate < 80) t.push("Attendance follow-up with guardian");
  if (r.average < 50) t.push("Assign to remedial / after-class support");
  if (!t.length) t.push("Maintain current support");
  return t;
}

export function aiData(scope: "secondary" | "upper") {
  const pool = activeStudents()
    .map(studentRisk)
    .filter(Boolean)
    .filter((r) => {
      const b = bandOf(r!.s.level);
      return scope === "secondary" ? b === "junior" || b === "senior" : b === "primary";
    }) as Risk[];
  const counts = {
    High: pool.filter((p) => p.level === "High").length,
    Medium: pool.filter((p) => p.level === "Medium").length,
    Low: pool.filter((p) => p.level === "Low").length,
  };
  const predicted = pool.length ? Math.round((pool.filter((p) => p.onTrack).length / pool.length) * 100) : 0;
  return { pool, counts, predicted, onTrack: pool.filter((p) => p.onTrack).length };
}

/* ---------------- section leaders ---------------- */
export function sectionLeaders() {
  const pool = scoredStudents();
  const top = (test: (lvl: string) => boolean) => {
    const arr = pool.filter((p) => test(p.s.level));
    return arr.sort((a, b) => b.average - a.average)[0] ?? null;
  };
  return {
    primary: top((l) => l.startsWith("Primary")),
    junior: top((l) => l.startsWith("JSS")),
    senior: top((l) => l.startsWith("SSS")),
    overall: [...pool].sort((a, b) => b.average - a.average)[0] ?? null,
  };
}

/* ---------------- report card builder ---------------- */
function seededRng(seed: string) {
  let a = seedFrom(seed);
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const AFFECTIVE_TRAITS = ["Punctuality", "Neatness", "Politeness", "Attentiveness", "Leadership", "Sports", "Handwriting"];

export function buildReportCard(s: Student) {
  const a = getAcademics(s);
  const klass = niceClass(s);
  const att = getAttendance(s);
  const r = seededRng(s.id + ":rc");
  const affective = AFFECTIVE_TRAITS.map((trait) => ({ trait, score: 3 + Math.floor(r() * 3) })); // 3–5
  const age = 2026 - parseInt(s.dob.slice(0, 4), 10);
  const totalDays = 122;
  const present = Math.round((att.rate / 100) * totalDays);

  if (a.kind !== "academic") {
    return { kind: "dev" as const, s, klass, age, skills: a.skills, comment: a.comment, affective, present, totalDays };
  }

  const classmates = activeStudents().filter((x) => niceClass(x) === klass);
  const cmAcad = classmates
    .map((x) => {
      const ac = getAcademics(x);
      return ac.kind === "academic" ? { id: x.id, average: ac.average, subjects: ac.subjects } : null;
    })
    .filter(Boolean) as { id: string; average: number; subjects: SubjectScore[] }[];

  const ranked = [...cmAcad].sort((p, q) => q.average - p.average);
  const position = Math.max(1, ranked.findIndex((rr) => rr.id === s.id) + 1);
  const numberInClass = cmAcad.length;

  const subjects = a.subjects.map((sub) => {
    const totals = cmAcad.map((y) => y.subjects.find((z) => z.subject === sub.subject)?.total).filter((v): v is number => v != null);
    const classAvg = totals.length ? Math.round(totals.reduce((p, q) => p + q, 0) / totals.length) : sub.total;
    const subjPos = Math.max(1, [...totals].sort((p, q) => q - p).indexOf(sub.total) + 1);
    const remark = sub.total >= 75 ? "Excellent" : sub.total >= 65 ? "Very good" : sub.total >= 50 ? "Credit" : sub.total >= 45 ? "Pass" : "Fail";
    return { ...sub, classAvg, subjPos, remark };
  });
  const obtainable = subjects.length * 100;
  const obtained = subjects.reduce((p, q) => p + q.total, 0);
  const average = Math.round(obtained / subjects.length);
  const dId = deptIdOf(s);
  const dept = dId ? getDeptName(dId) : null;

  return { kind: "academic" as const, s, klass, dept, age, position, numberInClass, subjects, obtainable, obtained, average, present, totalDays, affective };
}
export type BuiltReportCard = ReturnType<typeof buildReportCard>;

/* ---------------- early-years (developmental) class reports ----------------
   Lower classes (Crèche / KG / Nursery) have no exam scores — children are
   assessed against developmental milestones. We rank a "best child" per class
   by milestones met and surface per-skill class progress + who needs support. */
const DEV_VAL: Record<string, number> = { Excellent: 2, Developing: 1, "Needs support": 0 };

export type DevChild = { s: Student; score: number; max: number; metPct: number; weak: string[] };
export type DevClassReport = {
  klass: string;
  children: DevChild[]; // ranked, best first
  best: DevChild;
  skillAvgs: { label: string; pct: number }[];
  classMetPct: number;
};

export function devClassReports(): DevClassReport[] {
  const map: Record<string, { s: Student; skills: { label: string; rating: string }[] }[]> = {};
  activeStudents()
    .filter((s) => bandOf(s.level) === "early")
    .forEach((s) => {
      const a = getAcademics(s);
      if (a.kind !== "academic" && "skills" in a) (map[niceClass(s)] = map[niceClass(s)] || []).push({ s, skills: a.skills });
    });

  return Object.entries(map)
    .map(([klass, arr]) => {
      const children: DevChild[] = arr
        .map(({ s, skills }) => {
          const score = skills.reduce((t, sk) => t + (DEV_VAL[sk.rating] ?? 0), 0);
          const met = skills.filter((sk) => sk.rating !== "Needs support").length;
          return {
            s,
            score,
            max: skills.length * 2,
            metPct: Math.round((met / skills.length) * 100),
            weak: skills.filter((sk) => sk.rating === "Needs support").map((sk) => sk.label),
          };
        })
        .sort((a, b) => b.score - a.score || b.metPct - a.metPct);
      const labels = arr[0].skills.map((sk) => sk.label);
      const skillAvgs = labels.map((label) => {
        const vals = arr.map((x) => DEV_VAL[x.skills.find((sk) => sk.label === label)?.rating ?? ""] ?? 0);
        return { label, pct: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length / 2) * 100) };
      });
      const classMetPct = Math.round(children.reduce((t, c) => t + c.metPct, 0) / children.length);
      return { klass, children, best: children[0], skillAvgs, classMetPct };
    })
    .sort(
      (a, b) =>
        LEVELS.indexOf(a.children[0].s.level as never) - LEVELS.indexOf(b.children[0].s.level as never) || a.klass.localeCompare(b.klass),
    );
}

/** Best child across all early-years classes — ranked by milestones met. */
export function earlyYearsLeader(): { s: Student; klass: string; metPct: number } | null {
  const kids = devClassReports().flatMap((c) => c.children);
  if (!kids.length) return null;
  const best = [...kids].sort((a, b) => b.score - a.score || b.metPct - a.metPct)[0];
  return { s: best.s, klass: niceClass(best.s), metPct: best.metPct };
}

// re-export for components
export { getDeptName };
