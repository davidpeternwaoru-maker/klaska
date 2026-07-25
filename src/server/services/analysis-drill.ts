import "server-only";

// Result-analysis drill-down data. Loads the results the user is ALLOWED to see
// (RBAC scoped server-side: Owner/HOS whole school, HOD their department only,
// Teacher their own classes) plus the previous term's averages (for "most
// improved"). The client walks the hierarchy — school → section → level → arm →
// department → subject — and computes the analysis bundle at any scope from
// this already-scoped dataset, so the API never returns data a role can't see.

import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/jwt";

const TERM_SEQ = ["FIRST", "SECOND", "THIRD"];
const TERM_LABEL: Record<string, string> = { FIRST: "First Term", SECOND: "Second Term", THIRD: "Third Term" };
type Section = "SENIOR" | "JUNIOR" | "PRIMARY" | "EARLY";

function sectionOf(name: string, levelSection: string | null): Section {
  if (levelSection === "SENIOR" || levelSection === "JUNIOR" || levelSection === "PRIMARY" || levelSection === "EARLY") return levelSection;
  const n = (name || "").toUpperCase();
  if (n.startsWith("SSS") || n.includes("SENIOR")) return "SENIOR";
  if (n.startsWith("JSS") || n.includes("JUNIOR")) return "JUNIOR";
  if (n.startsWith("PRIMARY") || n.startsWith("BASIC")) return "PRIMARY";
  return "EARLY";
}
function prevTerm(session: string, term: string): { session: string; term: string } {
  const i = TERM_SEQ.indexOf(term);
  if (i > 0) return { session, term: TERM_SEQ[i - 1] };
  const [a, b] = session.split("/").map(Number);
  return { session: `${a - 1}/${b - 1}`, term: "THIRD" };
}

export type AnalysisRow = {
  studentId: string;
  student: string;
  section: Section;
  level: string; // canonical level name (SSS 2)
  levelLabel: string; // school's configured label
  arm: string | null;
  classId: string;
  className: string; // level + arm
  department: string | null;
  subject: string;
  total: number;
};

export type DrilldownData = {
  rows: AnalysisRow[];
  prevAvg: Record<string, number>; // studentId -> previous-term overall average
  meta: {
    school: string;
    logoUrl: string | null;
    session: string;
    term: string;
    termLabel: string;
    prevLabel: string;
    scopeLabel: string; // what this role is allowed to see
    sectionLabels: Record<string, string>;
  };
};

export async function getDrilldownData(user: SessionUser): Promise<DrilldownData> {
  const school = await prisma.school.findUnique({ where: { id: user.schoolId }, select: { name: true, logoUrl: true, session: true, term: true } });
  const session = school?.session ?? "";
  const term = school?.term ?? "THIRD";
  const prev = prevTerm(session, term);

  const [levels, departments] = await Promise.all([
    prisma.level.findMany({ where: { schoolId: user.schoolId } }),
    prisma.department.findMany({ where: { schoolId: user.schoolId } }),
  ]);
  const levelLabelByName = new Map(levels.map((l) => [l.name, l.label || l.name]));
  const sectionLabels: Record<string, string> = {};
  for (const sec of ["SENIOR", "JUNIOR", "PRIMARY", "EARLY"]) {
    const withLabel = levels.find((l) => l.section === sec && l.label);
    sectionLabels[sec] = withLabel?.label?.replace(/\s*\d+.*$/, "").trim() || { SENIOR: "Senior Secondary", JUNIOR: "Junior Secondary", PRIMARY: "Primary", EARLY: "Early Years" }[sec]!;
  }

  // ---- RBAC: which results may this role see? ----
  let where: import("@prisma/client").Prisma.ResultWhereInput = { schoolId: user.schoolId };
  let scopeLabel = "Whole school";
  if (user.role === "TEACHER") {
    // Classes the teacher OWNS (form) or TEACHES a subject in.
    const [owned, assigned] = await Promise.all([
      prisma.class.findMany({ where: { schoolId: user.schoolId, teacherId: user.staffId }, select: { id: true } }),
      prisma.teachingAssignment.findMany({ where: { schoolId: user.schoolId, teacherId: user.staffId }, select: { classId: true } }),
    ]);
    const classIds = Array.from(new Set([...owned.map((c) => c.id), ...assigned.map((a) => a.classId)]));
    where = { schoolId: user.schoolId, classId: { in: classIds } };
    scopeLabel = "Your classes";
  } else if (user.role === "HOD") {
    const me = await prisma.staff.findUnique({ where: { id: user.staffId }, select: { title: true } });
    const dept = departments.find((d) => (me?.title || "").toLowerCase().includes(d.name.toLowerCase()));
    if (dept) {
      where = { schoolId: user.schoolId, student: { departmentId: dept.id } };
      scopeLabel = `${dept.label || dept.name} department`;
    } else {
      where = { schoolId: user.schoolId, studentId: "__none__" }; // no identifiable dept → see nothing
      scopeLabel = "Your department";
    }
  }

  const [cur, before] = await Promise.all([
    prisma.result.findMany({
      where: { ...where, total: { not: null }, session, term },
      include: { student: { include: { department: true } }, subject: true },
    }),
    prisma.result.findMany({ where: { ...where, total: { not: null }, session: prev.session, term: prev.term }, select: { studentId: true, total: true } }),
  ]);

  // Result.classId is a scalar snapshot (no relation) — join classes manually.
  const classIds = [...new Set(cur.map((r) => r.classId).filter(Boolean) as string[])];
  const classList = await prisma.class.findMany({ where: { id: { in: classIds } }, include: { level: true } });
  const classById = new Map(classList.map((c) => [c.id, c]));

  const rows: AnalysisRow[] = cur
    .filter((r) => r.classId && classById.has(r.classId))
    .map((r) => {
      const c = classById.get(r.classId!)!;
      const section = sectionOf(c.name, c.level?.section ?? null);
      return {
        studentId: r.studentId,
        student: `${r.student.firstName} ${r.student.lastName}`,
        section,
        level: c.level?.name || c.name,
        levelLabel: levelLabelByName.get(c.level?.name || c.name) || c.level?.label || c.name,
        arm: c.arm,
        classId: c.id,
        className: c.arm ? `${c.name} ${c.arm}` : c.name,
        department: r.student.department?.label || r.student.department?.name || null,
        subject: r.subject.name,
        total: r.total!,
      };
    });

  // previous-term overall average per student
  const prevByStudent = new Map<string, number[]>();
  for (const b of before) {
    const arr = prevByStudent.get(b.studentId) ?? [];
    arr.push(b.total!);
    prevByStudent.set(b.studentId, arr);
  }
  const prevAvg: Record<string, number> = {};
  for (const [sid, totals] of prevByStudent) prevAvg[sid] = Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10;

  return {
    rows,
    prevAvg,
    meta: {
      school: school?.name ?? "School",
      logoUrl: school?.logoUrl ?? null,
      session,
      term,
      termLabel: TERM_LABEL[term] ?? term,
      prevLabel: `${TERM_LABEL[prev.term] ?? prev.term}${prev.session !== session ? " " + prev.session : ""}`,
      scopeLabel,
      sectionLabels,
    },
  };
}
