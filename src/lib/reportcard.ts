import "server-only";

// Assembles a class's report-card data from REAL records: results for the
// current term, per-subject class averages & positions, overall position in
// class, attendance summary, and the school's own grading bands.

import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/jwt";

export type CardSubjectRow = {
  subject: string;
  ca1: number | null;
  ca2: number | null;
  exam: number | null;
  total: number | null;
  grade: string | null;
  classAvg: number | null;
  pos: number | null;
  remark: string;
};

export type StudentCardData = {
  studentId: string;
  name: string;
  admissionNo: string | null;
  gender: string | null;
  average: number | null;
  position: number | null;
  subjects: CardSubjectRow[];
  obtained: number;
  obtainable: number;
  present: number;
  daysRecorded: number;
  classTeacherRemark: string | null;
};

export type Band = { label: string; minScore: number; maxScore: number; remark: string };

/** SECONDARY / PRIMARY / EARLY from a class's level name. */
export function categoryForClassName(name: string): "SECONDARY" | "PRIMARY" | "EARLY" {
  const n = name.toUpperCase();
  if (n.startsWith("JSS") || n.startsWith("SSS") || n.includes("SECONDARY")) return "SECONDARY";
  if (n.startsWith("PRIMARY") || n.startsWith("BASIC")) return "PRIMARY";
  return "EARLY";
}

export function remarkFor(bands: Band[], total: number | null): string {
  if (total == null) return "—";
  const b = bands.find((x) => total >= x.minScore && total <= x.maxScore);
  return b?.remark ?? "—";
}

/** Build card data for every student in a class (current term). */
export async function buildClassCards(user: SessionUser, classId: string) {
  const school = await prisma.school.findUnique({ where: { id: user.schoolId } });
  if (!school) return null;
  const klass = await prisma.class.findFirst({ where: { id: classId, schoolId: user.schoolId } });
  if (!klass) return null;

  const [students, results, bandsAll, attendance] = await Promise.all([
    prisma.student.findMany({ where: { schoolId: user.schoolId, classId }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
    prisma.result.findMany({
      where: {
        schoolId: user.schoolId,
        classId,
        ...(school.session && school.term ? { OR: [{ session: school.session, term: school.term }, { session: null }] } : {}),
      },
      include: { subject: true },
    }),
    prisma.gradingBand.findMany({ where: { schoolId: user.schoolId }, orderBy: { order: "asc" } }),
    prisma.attendance.groupBy({
      by: ["studentId", "status"],
      where: {
        schoolId: user.schoolId,
        classId,
        ...(school.session && school.term ? { OR: [{ session: school.session, term: school.term }, { session: null }] } : {}),
      },
      _count: { _all: true },
    }),
  ]);

  // The form teacher's overall remark per student, for the current term.
  const remarkRows = school.session && school.term
    ? await prisma.reportRemark.findMany({ where: { schoolId: user.schoolId, session: school.session, term: school.term, student: { classId } }, select: { studentId: true, classTeacherRemark: true } })
    : [];
  const classRemarkByStudent = new Map(remarkRows.map((r) => [r.studentId, r.classTeacherRemark]));

  const category = categoryForClassName(klass.name);
  const bands = bandsAll.filter((b) => b.category === category).map((b) => ({ label: b.label, minScore: b.minScore, maxScore: b.maxScore, remark: b.remark }));

  // subject -> totals (for class averages + positions)
  const bySubject = new Map<string, { name: string; totals: { studentId: string; total: number }[] }>();
  for (const r of results) {
    if (r.total == null) continue;
    const e = bySubject.get(r.subjectId) ?? { name: r.subject.name, totals: [] };
    e.totals.push({ studentId: r.studentId, total: r.total });
    bySubject.set(r.subjectId, e);
  }
  const classAvg = new Map<string, number>();
  const posInSubject = new Map<string, Map<string, number>>();
  for (const [sid, e] of bySubject) {
    classAvg.set(sid, Math.round(e.totals.reduce((t, x) => t + x.total, 0) / e.totals.length));
    const sorted = [...e.totals].sort((a, b) => b.total - a.total);
    const m = new Map<string, number>();
    sorted.forEach((x, i) => m.set(x.studentId, i > 0 && sorted[i - 1].total === x.total ? (m.get(sorted[i - 1].studentId) as number) : i + 1));
    posInSubject.set(sid, m);
  }

  // attendance per student
  const att = new Map<string, { present: number; total: number }>();
  for (const a of attendance) {
    const e = att.get(a.studentId) ?? { present: 0, total: 0 };
    e.total += a._count._all;
    if (a.status === "PRESENT" || a.status === "LATE") e.present += a._count._all;
    att.set(a.studentId, e);
  }

  // per-student rows
  const resultsByStudent = new Map<string, typeof results>();
  for (const r of results) {
    const arr = resultsByStudent.get(r.studentId) ?? [];
    arr.push(r);
    resultsByStudent.set(r.studentId, arr);
  }

  const cards: StudentCardData[] = students.map((s) => {
    const rs = (resultsByStudent.get(s.id) ?? []).sort((a, b) => a.subject.name.localeCompare(b.subject.name));
    const rows: CardSubjectRow[] = rs.map((r) => ({
      subject: r.subject.name,
      ca1: r.ca1,
      ca2: r.ca2,
      exam: r.exam,
      total: r.total,
      grade: r.grade,
      classAvg: classAvg.get(r.subjectId) ?? null,
      pos: posInSubject.get(r.subjectId)?.get(s.id) ?? null,
      // The subject teacher's written remark takes precedence over the auto band remark.
      remark: r.subjectRemark?.trim() || remarkFor(bands, r.total),
    }));
    const scored = rows.filter((r) => r.total != null);
    const obtained = scored.reduce((t, r) => t + (r.total ?? 0), 0);
    const average = scored.length ? Math.round(obtained / scored.length) : null;
    const a = att.get(s.id) ?? { present: 0, total: 0 };
    return {
      studentId: s.id,
      name: `${s.firstName} ${s.lastName}`,
      admissionNo: s.admissionNo,
      gender: s.gender,
      average,
      position: null, // filled below
      subjects: rows,
      obtained,
      obtainable: scored.length * 100,
      present: a.present,
      daysRecorded: a.total,
      classTeacherRemark: classRemarkByStudent.get(s.id) ?? null,
    };
  });

  // overall positions (rank by average; ties share a position)
  const ranked = cards.filter((c) => c.average != null).sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
  ranked.forEach((c, i) => {
    c.position = i > 0 && ranked[i - 1].average === c.average ? ranked[i - 1].position : i + 1;
  });

  return {
    school,
    klass,
    bands,
    cards,
    numberInClass: cards.filter((c) => c.average != null).length,
  };
}
