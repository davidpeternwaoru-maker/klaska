// Pure analysis math — given the scoped rows + a scope selection, compute the
// standard bundle (best students, best per subject, best per department, most
// improved, subject averages, weakest, full ranked list, and the drill-down
// children). Shared by the drill-down UI and the exporters so they never drift.

import type { AnalysisRow } from "@/server/services/analysis-drill";

export type Scope = { section?: string; level?: string; arm?: string; department?: string; subject?: string };

export type RankedStudent = { studentId: string; name: string; average: number; className: string; department: string | null };
export type SubjectStat = { subject: string; average: number; best: { name: string; total: number } | null };
export type DeptBest = { department: string; best: { name: string; average: number } | null; ranked: RankedStudent[] };
export type Improved = { studentId: string; name: string; from: number; to: number; delta: number };
export type ChildNode = { key: string; label: string; dim: Dim; average: number; count: number };
export type Dim = "section" | "level" | "arm" | "department" | "subject";

export type Bundle = {
  scopeTitle: string;
  count: number;
  average: number;
  passRate: number;
  bestStudents: RankedStudent[];
  ranked: RankedStudent[];
  bestPerSubject: SubjectStat[];
  bestPerDept: DeptBest[];
  mostImproved: Improved[];
  subjectAverages: { subject: string; average: number }[];
  weakest: { subject: string; average: number }[];
  children: ChildNode[];
  childDim: Dim | null;
};

export function scopeFilter(rows: AnalysisRow[], s: Scope): AnalysisRow[] {
  return rows.filter(
    (r) =>
      (!s.section || r.section === s.section) &&
      (!s.level || r.level === s.level) &&
      (!s.arm || r.arm === s.arm) &&
      (!s.department || r.department === s.department) &&
      (!s.subject || r.subject === s.subject),
  );
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const round = (n: number) => Math.round(n * 10) / 10;

/** Per-student averages within the given rows (a scope's rows). */
function studentAverages(rows: AnalysisRow[]): RankedStudent[] {
  const by = new Map<string, { name: string; className: string; department: string | null; totals: number[] }>();
  for (const r of rows) {
    const e = by.get(r.studentId) ?? { name: r.student, className: r.className, department: r.department, totals: [] };
    e.totals.push(r.total);
    by.set(r.studentId, e);
  }
  return [...by.entries()]
    .map(([studentId, e]) => ({ studentId, name: e.name, className: e.className, department: e.department, average: round(mean(e.totals)) }))
    .sort((a, b) => b.average - a.average);
}

/** What dimension do we drill into next, given the current scope + whether SS is present? */
export function nextDim(scope: Scope, rows: AnalysisRow[]): Dim | null {
  if (!scope.section) return "section";
  if (!scope.level) return "level";
  if (!scope.arm) return "arm";
  // department only makes sense for Senior Secondary
  if (scope.section === "SENIOR" && !scope.department && rows.some((r) => r.department)) return "department";
  if (!scope.subject) return "subject";
  return null;
}

function keyOf(r: AnalysisRow, dim: Dim): { key: string; label: string } | null {
  switch (dim) {
    case "section":
      return { key: r.section, label: r.section };
    case "level":
      return { key: r.level, label: r.levelLabel };
    case "arm":
      return { key: r.arm ?? "—", label: r.arm ? `${r.levelLabel} ${r.arm}` : r.levelLabel };
    case "department":
      return r.department ? { key: r.department, label: r.department } : null;
    case "subject":
      return { key: r.subject, label: r.subject };
  }
}

export function computeBundle(rows: AnalysisRow[], prevAvg: Record<string, number>, scope: Scope, sectionLabels: Record<string, string>): Bundle {
  const scoped = scopeFilter(rows, scope);
  const students = studentAverages(scoped);
  const average = round(mean(students.map((s) => s.average)));
  const passRate = students.length ? Math.round((students.filter((s) => s.average >= 50).length / students.length) * 100) : 0;

  // per subject
  const subjMap = new Map<string, { totals: number[]; best: { name: string; total: number } | null }>();
  for (const r of scoped) {
    const e = subjMap.get(r.subject) ?? { totals: [], best: null };
    e.totals.push(r.total);
    if (!e.best || r.total > e.best.total) e.best = { name: r.student, total: r.total };
    subjMap.set(r.subject, e);
  }
  const bestPerSubject: SubjectStat[] = [...subjMap.entries()]
    .map(([subject, v]) => ({ subject, average: round(mean(v.totals)), best: v.best }))
    .sort((a, b) => a.subject.localeCompare(b.subject));
  const subjectAverages = bestPerSubject.map((s) => ({ subject: s.subject, average: s.average })).sort((a, b) => b.average - a.average);
  const weakest = [...subjectAverages].sort((a, b) => a.average - b.average).slice(0, 5);

  // per department (SS): rank students within each department by their scope average
  const bestPerDept: DeptBest[] = [];
  if (scoped.some((r) => r.department)) {
    const depts = [...new Set(scoped.filter((r) => r.department).map((r) => r.department as string))].sort();
    for (const d of depts) {
      const inDept = students.filter((s) => s.department === d);
      bestPerDept.push({ department: d, best: inDept[0] ? { name: inDept[0].name, average: inDept[0].average } : null, ranked: inDept });
    }
  }

  // most improved vs previous term
  const mostImproved: Improved[] = students
    .filter((s) => prevAvg[s.studentId] != null)
    .map((s) => ({ studentId: s.studentId, name: s.name, from: prevAvg[s.studentId], to: s.average, delta: round(s.average - prevAvg[s.studentId]) }))
    .filter((s) => s.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 10);

  // drill children
  const dim = nextDim(scope, scoped);
  const children: ChildNode[] = [];
  if (dim) {
    const groups = new Map<string, { label: string; totals: number[]; students: Set<string> }>();
    for (const r of scoped) {
      const k = keyOf(r, dim);
      if (!k) continue;
      const g = groups.get(k.key) ?? { label: k.label, totals: [], students: new Set() };
      g.totals.push(r.total);
      g.students.add(r.studentId);
      groups.set(k.key, g);
    }
    for (const [key, g] of groups) children.push({ key, label: dim === "section" ? sectionLabels[key] || key : g.label, dim, average: round(mean(g.totals)), count: g.students.size });
    children.sort((a, b) => (dim === "subject" ? b.average - a.average : a.label.localeCompare(b.label)));
  }

  const scopeTitle =
    scope.subject || scope.department || scope.arm
      ? [scope.arm && scope.arm, scope.department, scope.subject].filter(Boolean).join(" · ")
      : scope.level || (scope.section ? sectionLabels[scope.section] || scope.section : "Whole school");

  return {
    scopeTitle: String(scopeTitle),
    count: students.length,
    average,
    passRate,
    bestStudents: students.slice(0, 5),
    ranked: students,
    bestPerSubject,
    bestPerDept,
    mostImproved,
    subjectAverages,
    weakest,
    children,
    childDim: dim,
  };
}
