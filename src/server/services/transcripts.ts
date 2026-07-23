import "server-only";

// Official academic transcript engine. Assembles a student's FULL multi-session
// academic history (session → term → subjects, with per-term average + position
// and the level attended), a cumulative summary, attendance, the school's own
// grading key, and records a serialized audit row for every transcript issued.
//
// Access (matrix "transcripts" = full): OWNER, HOS, ADMIN only. Enforced here so
// the API rejects everyone else regardless of the UI.

import { prisma } from "@/lib/db";
import { type Ctx, ServiceError } from "@/server/context";
import { canManage } from "@/lib/auth/permissions";

const TERM_ORDER: Record<string, number> = { FIRST: 1, SECOND: 2, THIRD: 3 };
const TERM_LABEL: Record<string, string> = { FIRST: "First Term", SECOND: "Second Term", THIRD: "Third Term" };
type Section = "SENIOR" | "JUNIOR" | "PRIMARY" | "EARLY";
const SECTION_FALLBACK: Record<Section, string> = { SENIOR: "Senior Secondary", JUNIOR: "Junior Secondary", PRIMARY: "Primary", EARLY: "Early Years" };
const SECTION_CATEGORY: Record<Section, string> = { SENIOR: "SECONDARY", JUNIOR: "SECONDARY", PRIMARY: "PRIMARY", EARLY: "EARLY" };

function requireGenerate(ctx: Ctx) {
  if (!canManage(ctx.role, "transcripts")) throw new ServiceError("Only the owner, principal or admin officer can generate transcripts.");
}

/** Infer a class's section from its Level (authoritative, custom-label aware) or its name. */
function sectionOfClass(name: string, levelSection: string | null): Section {
  if (levelSection === "SENIOR" || levelSection === "JUNIOR" || levelSection === "PRIMARY" || levelSection === "EARLY") return levelSection;
  const n = name.toUpperCase();
  if (n.startsWith("SSS") || n.includes("SENIOR")) return "SENIOR";
  if (n.startsWith("JSS") || n.includes("JUNIOR")) return "JUNIOR";
  if (n.startsWith("PRIMARY") || n.startsWith("BASIC")) return "PRIMARY";
  return "EARLY";
}

const fmt = (d: Date | null | undefined) => (d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");

export type TranscriptSubjectRow = { subject: string; total: number | null; grade: string | null };
export type TranscriptTermBlock = {
  session: string;
  term: string;
  termLabel: string;
  levelLabel: string; // the school's configured level label (or class name)
  arm: string | null;
  subjects: TranscriptSubjectRow[];
  average: number | null;
  position: number | null;
  classSize: number;
};
export type TranscriptGradeKey = { label: string; range: string; remark: string };
export type TranscriptData = {
  serial: string;
  issuedAt: string;
  section: Section;
  sectionLabel: string;
  school: { name: string; shortName: string | null; address: string | null; email: string | null; phone: string | null; logoUrl: string | null };
  student: {
    name: string;
    admissionNo: string | null;
    dob: string;
    gender: string | null;
    photoUrl: string | null;
    admittedAt: string;
    leftAt: string | null;
    status: string;
    department: string | null;
  };
  terms: TranscriptTermBlock[];
  summary: { cumulativeAverage: number | null; sessionsAttended: number; termsCovered: number; overall: string };
  attendance: { present: number; recorded: number; pct: number | null };
  gradeKey: TranscriptGradeKey[];
  remarks: string | null;
  principalName: string;
  registrarName: string;
};

/** Available sections for a student (those they actually have results in) + identity — drives the modal. */
export async function getTranscriptOptions(ctx: Ctx, studentId: string) {
  requireGenerate(ctx);
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId: ctx.schoolId },
    include: { class: { include: { level: true } }, department: true },
  });
  if (!student) throw new ServiceError("Student not found.", "NOT_FOUND");

  const [results, levels, sessions] = await Promise.all([
    prisma.result.findMany({ where: { schoolId: ctx.schoolId, studentId }, select: { classId: true, session: true, term: true } }),
    prisma.level.findMany({ where: { schoolId: ctx.schoolId }, select: { name: true, label: true, section: true } }),
    prisma.school.findUnique({ where: { id: ctx.schoolId }, select: { sections: true } }),
  ]);

  // resolve each result's section via its class's level
  const classIds = [...new Set(results.map((r) => r.classId).filter(Boolean) as string[])];
  const classes = await prisma.class.findMany({ where: { id: { in: classIds } }, include: { level: true } });
  const classSection = new Map(classes.map((c) => [c.id, sectionOfClass(c.name, c.level?.section ?? null)]));

  const sectionsWithData = new Set<Section>();
  const sessionSet = new Set<string>();
  for (const r of results) {
    if (r.session) sessionSet.add(r.session);
    const sec = r.classId ? classSection.get(r.classId) : undefined;
    if (sec) sectionsWithData.add(sec);
  }
  // the student's current section (so a brand-new student can still generate)
  const current = sectionOfClass(student.class?.name ?? "", student.class?.level?.section ?? null);
  sectionsWithData.add(current);

  const sectionLabelOf = (sec: Section) => {
    const inSec = levels.filter((l) => l.section === sec && l.label);
    return inSec[0]?.label?.replace(/\s*\d+.*$/, "").trim() || SECTION_FALLBACK[sec];
  };

  return {
    student: { id: student.id, name: `${student.firstName} ${student.lastName}`, admissionNo: student.admissionNo, status: student.status },
    sections: [...sectionsWithData]
      .filter((s) => (sessions?.sections?.length ? sessions.sections.includes(s) || true : true))
      .sort((a, b) => ["SENIOR", "JUNIOR", "PRIMARY", "EARLY"].indexOf(a) - ["SENIOR", "JUNIOR", "PRIMARY", "EARLY"].indexOf(b))
      .map((s) => ({ section: s, label: sectionLabelOf(s) })),
    sessionsAvailable: [...sessionSet].sort(),
  };
}

/** Build the full transcript, record the audit row + serial, and return the document data. */
export async function generateTranscript(
  ctx: Ctx,
  input: { studentId: string; section: Section; fromSession?: string | null; toSession?: string | null; remarks?: string | null },
): Promise<TranscriptData> {
  requireGenerate(ctx);
  const { studentId, section } = input;

  const [school, student, levels, bandsAll] = await Promise.all([
    prisma.school.findUnique({ where: { id: ctx.schoolId } }),
    prisma.student.findFirst({ where: { id: studentId, schoolId: ctx.schoolId }, include: { department: true } }),
    prisma.level.findMany({ where: { schoolId: ctx.schoolId } }),
    prisma.gradingBand.findMany({ where: { schoolId: ctx.schoolId }, orderBy: { order: "asc" } }),
  ]);
  if (!school) throw new ServiceError("School not found.", "NOT_FOUND");
  if (!student) throw new ServiceError("Student not found.", "NOT_FOUND");

  // Every result this student has, with the class attended (for section + level label).
  const results = await prisma.result.findMany({
    where: { schoolId: ctx.schoolId, studentId },
    include: { subject: true },
  });
  const classIds = [...new Set(results.map((r) => r.classId).filter(Boolean) as string[])];
  const classes = await prisma.class.findMany({ where: { id: { in: classIds } }, include: { level: true } });
  const classById = new Map(classes.map((c) => [c.id, c]));

  const levelLabelOfClass = (classId: string | null) => {
    const c = classId ? classById.get(classId) : null;
    if (!c) return { label: "—", arm: null as string | null, section: section };
    const lvl = c.level;
    const label = lvl?.label || lvl?.name || c.name;
    return { label, arm: c.arm, section: sectionOfClass(c.name, lvl?.section ?? null) };
  };

  // Keep only results in the chosen section, within the optional session range.
  const inRange = (s: string | null) => {
    if (!s) return true;
    if (input.fromSession && s < input.fromSession) return false;
    if (input.toSession && s > input.toSession) return false;
    return true;
  };
  const relevant = results.filter((r) => {
    if (!inRange(r.session)) return false;
    const info = levelLabelOfClass(r.classId);
    return info.section === section;
  });

  // Group by session → term.
  type Key = string;
  const groups = new Map<Key, { session: string; term: string; classId: string | null; rows: TranscriptSubjectRow[]; totals: number[] }>();
  for (const r of relevant) {
    const session = r.session ?? "—";
    const term = r.term ?? "—";
    const key = `${session}__${term}`;
    const g = groups.get(key) ?? { session, term, classId: r.classId, rows: [], totals: [] };
    g.rows.push({ subject: r.subject.name, total: r.total, grade: r.grade });
    if (r.total != null) g.totals.push(r.total);
    groups.set(key, g);
  }

  // Positions: for each (class, session, term) rank the student among classmates by average.
  const positionCache = new Map<string, { pos: number | null; size: number }>();
  async function positionFor(classId: string | null, session: string, term: string): Promise<{ pos: number | null; size: number }> {
    if (!classId) return { pos: null, size: 0 };
    const ck = `${classId}__${session}__${term}`;
    const cached = positionCache.get(ck);
    if (cached) return cached;
    const classResults = await prisma.result.findMany({
      where: { schoolId: ctx.schoolId, classId, session, term, total: { not: null } },
      select: { studentId: true, total: true },
    });
    const byStudent = new Map<string, number[]>();
    for (const cr of classResults) {
      const arr = byStudent.get(cr.studentId) ?? [];
      arr.push(cr.total as number);
      byStudent.set(cr.studentId, arr);
    }
    const avgs = [...byStudent.entries()].map(([sid, totals]) => ({ sid, avg: totals.reduce((a, b) => a + b, 0) / totals.length }));
    avgs.sort((a, b) => b.avg - a.avg);
    let pos: number | null = null;
    avgs.forEach((x, i) => {
      const rank = i > 0 && avgs[i - 1].avg === x.avg ? undefined : i + 1;
      if (x.sid === studentId) pos = rank ?? (avgs.findIndex((y) => y.avg === x.avg) + 1);
    });
    const out = { pos, size: avgs.length };
    positionCache.set(ck, out);
    return out;
  }

  const termBlocks: TranscriptTermBlock[] = [];
  for (const g of groups.values()) {
    const info = levelLabelOfClass(g.classId);
    const { pos, size } = await positionFor(g.classId, g.session, g.term);
    g.rows.sort((a, b) => a.subject.localeCompare(b.subject));
    termBlocks.push({
      session: g.session,
      term: g.term,
      termLabel: TERM_LABEL[g.term] ?? g.term,
      levelLabel: info.label,
      arm: info.arm,
      subjects: g.rows,
      average: g.totals.length ? Math.round((g.totals.reduce((a, b) => a + b, 0) / g.totals.length) * 100) / 100 : null,
      position: pos,
      classSize: size,
    });
  }
  termBlocks.sort((a, b) => (a.session === b.session ? (TERM_ORDER[a.term] ?? 9) - (TERM_ORDER[b.term] ?? 9) : a.session.localeCompare(b.session)));

  // Cumulative summary.
  const termAverages = termBlocks.map((t) => t.average).filter((a): a is number => a != null);
  const cumulativeAverage = termAverages.length ? Math.round((termAverages.reduce((a, b) => a + b, 0) / termAverages.length) * 100) / 100 : null;
  const sessionsAttended = new Set(termBlocks.map((t) => t.session)).size;
  const overall =
    cumulativeAverage == null ? "No records" : cumulativeAverage >= 75 ? "Distinction" : cumulativeAverage >= 60 ? "Credit" : cumulativeAverage >= 50 ? "Merit" : cumulativeAverage >= 40 ? "Pass" : "Below pass";

  // Attendance across the covered sessions/terms.
  const coveredSessions = [...new Set(termBlocks.map((t) => t.session))];
  const attRows = await prisma.attendance.groupBy({
    by: ["status"],
    where: { schoolId: ctx.schoolId, studentId, ...(coveredSessions.length ? { session: { in: coveredSessions } } : {}) },
    _count: { _all: true },
  });
  let present = 0,
    recorded = 0;
  for (const a of attRows) {
    recorded += a._count._all;
    if (a.status === "PRESENT" || a.status === "LATE") present += a._count._all;
  }

  // Grading key for the section's category.
  const category = SECTION_CATEGORY[section];
  const gradeKey: TranscriptGradeKey[] = bandsAll
    .filter((b) => b.category === category)
    .map((b) => ({ label: b.label, range: `${b.minScore}–${b.maxScore}`, remark: b.remark }));

  // Signatories.
  const [principal, registrar] = await Promise.all([
    prisma.staff.findFirst({ where: { schoolId: ctx.schoolId, role: "HOS" }, select: { name: true } }),
    prisma.staff.findFirst({ where: { schoolId: ctx.schoolId, role: "ADMIN" }, select: { name: true } }),
  ]);

  // Section label preferring the school's own level labels.
  const inSec = levels.filter((l) => l.section === section && l.label);
  const sectionLabel = inSec[0]?.label?.replace(/\s*\d+.*$/, "").trim() || SECTION_FALLBACK[section];

  // Serial + audit record (the durable issuance trail).
  const count = await prisma.transcript.count({ where: { schoolId: ctx.schoolId } });
  const yr = new Date().getFullYear();
  const short = (school.shortName || school.name).replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "SCH";
  const serial = `TR-${short}-${yr}-${String(count + 1).padStart(4, "0")}`;
  const coverage = input.fromSession || input.toSession ? `${input.fromSession ?? "start"}–${input.toSession ?? "present"}` : "Full history";

  await prisma.transcript.create({
    data: {
      schoolId: ctx.schoolId,
      studentId,
      serial,
      section,
      coverage,
      sessionsCount: sessionsAttended,
      requestedByStaffId: ctx.staffId,
      requestedByName: ctx.name,
      requestedByRole: ctx.role,
      remarks: input.remarks?.trim() || null,
    },
  });

  return {
    serial,
    issuedAt: fmt(new Date()),
    section,
    sectionLabel,
    school: { name: school.name, shortName: school.shortName, address: school.address, email: school.email, phone: school.phone, logoUrl: school.logoUrl },
    student: {
      name: `${student.firstName} ${student.lastName}`,
      admissionNo: student.admissionNo,
      dob: fmt(student.dob),
      gender: student.gender,
      photoUrl: student.photoUrl,
      admittedAt: fmt(student.admittedAt ?? student.createdAt),
      leftAt: student.status !== "ACTIVE" ? fmt(student.statusChangedAt) : null,
      status: student.status,
      department: section === "SENIOR" ? student.department?.label || student.department?.name || null : null,
    },
    terms: termBlocks,
    summary: { cumulativeAverage, sessionsAttended, termsCovered: termBlocks.length, overall },
    attendance: { present, recorded, pct: recorded ? Math.round((present / recorded) * 100) : null },
    gradeKey,
    remarks: input.remarks?.trim() || null,
    principalName: principal?.name || "____________________",
    registrarName: registrar?.name || "____________________",
  };
}

/** The school's transcript issuance log (audit trail). */
export async function listTranscripts(ctx: Ctx, studentId?: string) {
  requireGenerate(ctx);
  const rows = await prisma.transcript.findMany({
    where: { schoolId: ctx.schoolId, ...(studentId ? { studentId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { student: { select: { firstName: true, lastName: true, admissionNo: true } } },
  });
  return rows.map((t) => ({
    serial: t.serial,
    student: `${t.student.firstName} ${t.student.lastName}`,
    admissionNo: t.student.admissionNo,
    section: t.section,
    coverage: t.coverage,
    by: t.requestedByName,
    role: t.requestedByRole,
    when: t.createdAt.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
  }));
}
