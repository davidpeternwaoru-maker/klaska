import "server-only";

// Layer 4 intelligence: school-wide result analysis from REAL scores.
// Class by class — average, best student, best per subject, weakest subjects —
// then school leaders. Mirrors the analysis design, powered by live data.

import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/jwt";

export type SubjectStat = { subject: string; avg: number; best: { name: string; total: number } | null };
export type ClassAnalysis = {
  classId: string;
  label: string;
  studentsScored: number;
  classAvg: number;
  best: { name: string; average: number } | null;
  subjects: SubjectStat[];
  weakest: { subject: string; avg: number }[];
};
export type SchoolAnalysis = {
  termScoped: boolean;
  schoolAvg: number;
  passRate: number;
  bestOverall: { name: string; className: string; average: number } | null;
  classes: ClassAnalysis[];
  broadsheets: Record<string, { student: string; perSubject: Record<string, number | null>; average: number | null }[]>;
  subjectNames: Record<string, string[]>;
};

export async function buildSchoolAnalysis(user: SessionUser): Promise<SchoolAnalysis> {
  const school = await prisma.school.findUnique({ where: { id: user.schoolId }, select: { session: true, term: true } });
  const termFilter =
    school?.session && school.term ? { OR: [{ session: school.session, term: school.term }, { session: null }] } : {};

  const [classes, results] = await Promise.all([
    prisma.class.findMany({ where: { schoolId: user.schoolId }, orderBy: [{ name: "asc" }, { arm: "asc" }] }),
    prisma.result.findMany({
      where: { schoolId: user.schoolId, total: { not: null }, ...termFilter },
      include: { subject: true, student: true },
    }),
  ]);

  const label = (c: (typeof classes)[number]) => (c.arm ? `${c.name} ${c.arm}` : c.name);
  const byClass = new Map<string, typeof results>();
  for (const r of results) {
    if (!r.classId) continue;
    const arr = byClass.get(r.classId) ?? [];
    arr.push(r);
    byClass.set(r.classId, arr);
  }

  const classAnalyses: ClassAnalysis[] = [];
  const broadsheets: SchoolAnalysis["broadsheets"] = {};
  const subjectNames: SchoolAnalysis["subjectNames"] = {};
  let allAverages: { name: string; className: string; average: number }[] = [];

  for (const c of classes) {
    const rs = byClass.get(c.id) ?? [];
    if (rs.length === 0) continue;

    // per-student averages
    const perStudent = new Map<string, { name: string; totals: number[]; perSubject: Record<string, number | null> }>();
    const perSubject = new Map<string, { totals: number[]; best: { name: string; total: number } | null }>();
    for (const r of rs) {
      const sname = `${r.student.firstName} ${r.student.lastName}`;
      const ps = perStudent.get(r.studentId) ?? { name: sname, totals: [], perSubject: {} };
      ps.totals.push(r.total!);
      ps.perSubject[r.subject.name] = r.total;
      perStudent.set(r.studentId, ps);

      const sub = perSubject.get(r.subject.name) ?? { totals: [], best: null };
      sub.totals.push(r.total!);
      if (!sub.best || r.total! > sub.best.total) sub.best = { name: sname, total: r.total! };
      perSubject.set(r.subject.name, sub);
    }

    const studentAvgs = [...perStudent.values()].map((p) => ({
      name: p.name,
      average: Math.round(p.totals.reduce((t, x) => t + x, 0) / p.totals.length),
      perSubject: p.perSubject,
    }));
    const classAvg = Math.round(studentAvgs.reduce((t, s) => t + s.average, 0) / studentAvgs.length);
    const best = [...studentAvgs].sort((a, b) => b.average - a.average)[0] ?? null;

    const subjects: SubjectStat[] = [...perSubject.entries()]
      .map(([subject, v]) => ({ subject, avg: Math.round(v.totals.reduce((t, x) => t + x, 0) / v.totals.length), best: v.best }))
      .sort((a, b) => a.subject.localeCompare(b.subject));

    classAnalyses.push({
      classId: c.id,
      label: label(c),
      studentsScored: studentAvgs.length,
      classAvg,
      best: best ? { name: best.name, average: best.average } : null,
      subjects,
      weakest: [...subjects].sort((a, b) => a.avg - b.avg).slice(0, 3).map((s) => ({ subject: s.subject, avg: s.avg })),
    });

    subjectNames[c.id] = subjects.map((s) => s.subject);
    broadsheets[c.id] = studentAvgs
      .sort((a, b) => b.average - a.average)
      .map((s) => ({ student: s.name, perSubject: s.perSubject, average: s.average }));

    allAverages = allAverages.concat(studentAvgs.map((s) => ({ name: s.name, className: label(c), average: s.average })));
  }

  const schoolAvg = allAverages.length ? Math.round(allAverages.reduce((t, s) => t + s.average, 0) / allAverages.length) : 0;
  const passRate = allAverages.length ? Math.round((allAverages.filter((s) => s.average >= 50).length / allAverages.length) * 100) : 0;
  const bestOverall = [...allAverages].sort((a, b) => b.average - a.average)[0] ?? null;

  return {
    termScoped: !!(school?.session && school.term),
    schoolAvg,
    passRate,
    bestOverall,
    classes: classAnalyses,
    broadsheets,
    subjectNames,
  };
}
