import "server-only";

// AI Outcomes on REAL data. For every student with scores: average, attendance
// rate, weak subjects → a transparent risk score → On track / Borderline /
// At risk, plus a predicted exam-readiness figure for exam classes and
// concrete intervention suggestions. Deterministic and explainable — the
// heavier ML lives in a later phase; this is the real-data foundation.

import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/jwt";
import { classScope } from "@/lib/auth/scope";

export type RiskCat = "on" | "border" | "risk";
export type AIStudent = {
  studentId: string;
  name: string;
  classLabel: string;
  average: number;
  attRate: number | null; // % of recorded days present/late, null if none recorded
  weak: { subject: string; total: number }[];
  predicted: number; // readiness %, attendance-adjusted
  cat: RiskCat;
  isExamClass: boolean;
  actions: string[];
};
export type AIOutcomes = {
  students: AIStudent[];
  counts: Record<RiskCat, number>;
  onTrackPct: number;
  examOnTrackPct: number | null; // exam classes only (JSS 3 / SSS 2 / SSS 3)
  byClass: { label: string; on: number; border: number; risk: number; pct: number }[];
  interventions: AIStudent[];
};

const isExamLevel = (name: string) => /^(JSS\s*3|SSS\s*[23])/i.test(name.trim());

function catFor(predicted: number): RiskCat {
  if (predicted >= 65) return "on";
  if (predicted >= 50) return "border";
  return "risk";
}

function actionsFor(s: { weak: { subject: string }[]; attRate: number | null; average: number }): string[] {
  const out: string[] = [];
  if (s.weak.length) out.push(`Targeted practice: ${s.weak.slice(0, 2).map((w) => w.subject).join(" & ")}`);
  if (s.attRate != null && s.attRate < 80) out.push("Attendance follow-up with guardian");
  if (s.average < 50) out.push("Assign to remedial / after-school support");
  if (!out.length) out.push("Maintain current support");
  return out;
}

export async function buildAIOutcomes(user: SessionUser): Promise<AIOutcomes> {
  const school = await prisma.school.findUnique({ where: { id: user.schoolId }, select: { session: true, term: true } });
  const termFilter =
    school?.session && school.term ? { OR: [{ session: school.session, term: school.term }, { session: null }] } : {};

  const classes = await prisma.class.findMany({ where: classScope(user) });
  const classIds = classes.map((c) => c.id);
  const classById = new Map(classes.map((c) => [c.id, c]));

  const [results, attendance] = await Promise.all([
    prisma.result.findMany({
      where: { schoolId: user.schoolId, total: { not: null }, classId: { in: classIds }, ...termFilter },
      include: { subject: true, student: true },
    }),
    prisma.attendance.groupBy({
      by: ["studentId", "status"],
      where: { schoolId: user.schoolId, classId: { in: classIds }, ...termFilter },
      _count: { _all: true },
    }),
  ]);

  const att = new Map<string, { present: number; total: number }>();
  for (const a of attendance) {
    const e = att.get(a.studentId) ?? { present: 0, total: 0 };
    e.total += a._count._all;
    if (a.status === "PRESENT" || a.status === "LATE") e.present += a._count._all;
    att.set(a.studentId, e);
  }

  const byStudent = new Map<string, { name: string; classId: string; totals: number[]; weak: { subject: string; total: number }[] }>();
  for (const r of results) {
    const e = byStudent.get(r.studentId) ?? {
      name: `${r.student.firstName} ${r.student.lastName}`,
      classId: r.classId ?? "",
      totals: [],
      weak: [],
    };
    e.totals.push(r.total!);
    if (r.total! < 50) e.weak.push({ subject: r.subject.name, total: r.total! });
    byStudent.set(r.studentId, e);
  }

  const students: AIStudent[] = [...byStudent.entries()].map(([studentId, e]) => {
    const average = Math.round(e.totals.reduce((t, x) => t + x, 0) / e.totals.length);
    const a = att.get(studentId);
    const attRate = a && a.total > 0 ? Math.round((a.present / a.total) * 100) : null;
    // readiness: the average, nudged by attendance (±0.2 pts per % away from 85)
    const predicted = Math.min(98, Math.max(5, Math.round(average + (attRate != null ? (attRate - 85) * 0.2 : 0))));
    const klass = classById.get(e.classId);
    const classLabel = klass ? (klass.arm ? `${klass.name} ${klass.arm}` : klass.name) : "—";
    const base = { weak: e.weak, attRate, average };
    return {
      studentId,
      name: e.name,
      classLabel,
      average,
      attRate,
      weak: e.weak.sort((x, y) => x.total - y.total).slice(0, 3),
      predicted,
      cat: catFor(predicted),
      isExamClass: klass ? isExamLevel(klass.name) : false,
      actions: actionsFor(base),
    };
  });

  const counts: Record<RiskCat, number> = { on: 0, border: 0, risk: 0 };
  students.forEach((s) => counts[s.cat]++);
  const onTrackPct = students.length ? Math.round((counts.on / students.length) * 100) : 0;
  const exam = students.filter((s) => s.isExamClass);
  const examOnTrackPct = exam.length ? Math.round((exam.filter((s) => s.cat === "on").length / exam.length) * 100) : null;

  const byClassMap = new Map<string, { on: number; border: number; risk: number }>();
  for (const s of students) {
    const e = byClassMap.get(s.classLabel) ?? { on: 0, border: 0, risk: 0 };
    e[s.cat]++;
    byClassMap.set(s.classLabel, e);
  }
  const byClass = [...byClassMap.entries()]
    .map(([label, v]) => ({ label, ...v, pct: Math.round((v.on / (v.on + v.border + v.risk)) * 100) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const interventions = students
    .filter((s) => s.cat !== "on")
    .sort((a, b) => a.predicted - b.predicted)
    .slice(0, 12);

  return { students, counts, onTrackPct, examOnTrackPct, byClass, interventions };
}
