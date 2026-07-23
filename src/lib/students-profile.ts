import "server-only";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/jwt";
import { canManage } from "@/lib/auth/permissions";

// Deterministic avatar tint from an id (same helper the students list uses).
export const hueOf = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

export type ProfileSubject = { subject: string; ca1: number; ca2: number; exam: number; total: number; grade: string };
export type TermRecord = {
  session: string;
  term: string;
  termLabel: string;
  levelLabel: string; // school's configured level label
  arm: string | null;
  className: string;
  subjects: ProfileSubject[];
  average: number;
  position: number;
  classSize: number;
};
export type ProfileData = {
  id: string;
  name: string;
  hue: number;
  gender: "M" | "F" | null;
  dob: string;
  admissionNo: string | null;
  className: string;
  isSenior: boolean;
  department: string | null;
  status: "active" | "graduated" | "left";
  admittedOn: string;
  exitedOn: string | null;
  leftReason: string | null;
  guardian: { name: string; relation: string | null; phone: string | null; email: string | null } | null;
  academics: { subjects: ProfileSubject[]; average: number; position: number; classSize: number; currentLabel: string; terms: TermRecord[] };
  attendance: { rate: number; late: number; absent: number; recent: ("present" | "late" | "absent")[] };
  fees: { termFee: number; paid: number; outstanding: number; ledger: { term: string; due: number; paid: number; method: string; date: string }[] };
  history: { title: string; date: string; meta: string }[];
  canGenerateTranscript: boolean; // OWNER / HOS / ADMIN — server-decided
};

const STATUS_MAP: Record<string, "active" | "graduated" | "left"> = { ACTIVE: "active", GRADUATED: "graduated", LEFT: "left" };
const TERM_LABEL: Record<string, string> = { FIRST: "First Term", SECOND: "Second Term", THIRD: "Third Term" };
const EVENT_TITLE: Record<string, string> = { ENROLLED: "Enrolled", PROMOTED: "Promoted", REPEATED: "Repeated", GRADUATED: "Graduated", LEFT: "Left school", TRANSFERRED: "Transferred", REINSTATED: "Reinstated" };
const fmtDay = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const fmtMonth = (d: Date) => d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });

/** Load a full student profile from the database, scoped to the user's school
 *  (and to a teacher's own classes). Returns null if not found / not allowed. */
export async function getStudentProfile(user: SessionUser, id: string): Promise<ProfileData | null> {
  const student = await prisma.student.findFirst({
    where: {
      id,
      schoolId: user.schoolId,
      ...(user.role === "TEACHER" ? { class: { teacherId: user.staffId } } : {}),
    },
    include: { class: { include: { level: true, department: true } }, guardian: true, department: true },
  });
  if (!student) return null;

  const [school, results, attendance, invoices, events] = await Promise.all([
    prisma.school.findUnique({ where: { id: user.schoolId }, select: { session: true, term: true } }),
    prisma.result.findMany({ where: { studentId: id, schoolId: user.schoolId }, include: { subject: true } }),
    prisma.attendance.findMany({ where: { studentId: id, schoolId: user.schoolId }, orderBy: { date: "desc" } }),
    prisma.invoice.findMany({ where: { studentId: id, schoolId: user.schoolId }, include: { payments: { orderBy: { paidAt: "desc" } } }, orderBy: { createdAt: "desc" } }),
    prisma.studentEvent.findMany({ where: { studentId: id, schoolId: user.schoolId }, orderBy: { createdAt: "desc" } }),
  ]);

  // Classes attended (level label + arm per term) and the cohort's results (for per-term positions).
  const resultClassIds = [...new Set(results.map((r) => r.classId).filter(Boolean) as string[])];
  const [resultClasses, cohort] = await Promise.all([
    prisma.class.findMany({ where: { id: { in: resultClassIds } }, include: { level: true } }),
    prisma.result.findMany({ where: { schoolId: user.schoolId, classId: { in: resultClassIds }, total: { not: null } }, select: { studentId: true, classId: true, session: true, term: true, total: true } }),
  ]);
  const classById = new Map(resultClasses.map((c) => [c.id, c]));

  // (classId|session|term) -> per-student running average, for ranking each term.
  const cohortKey = (c: string | null, se: string | null, t: string | null) => `${c}|${se}|${t}`;
  const cohortMap = new Map<string, Map<string, { sum: number; n: number }>>();
  for (const cr of cohort) {
    const k = cohortKey(cr.classId, cr.session, cr.term);
    const m = cohortMap.get(k) ?? new Map<string, { sum: number; n: number }>();
    const e = m.get(cr.studentId) ?? { sum: 0, n: 0 };
    e.sum += cr.total!;
    e.n++;
    m.set(cr.studentId, e);
    cohortMap.set(k, m);
  }
  const rankIn = (c: string | null, se: string | null, t: string | null): { position: number; classSize: number } => {
    const m = cohortMap.get(cohortKey(c, se, t));
    if (!m) return { position: 0, classSize: 0 };
    const ranked = [...m.entries()].map(([sid, e]) => ({ sid, avg: e.sum / e.n })).sort((a, b) => b.avg - a.avg);
    const idx = ranked.findIndex((r) => r.sid === id);
    return { position: idx >= 0 ? idx + 1 : 0, classSize: ranked.length };
  };

  // Group the student's results into their full session -> term academic history.
  const TERM_ORDER: Record<string, number> = { FIRST: 1, SECOND: 2, THIRD: 3 };
  const termMap = new Map<string, { session: string; term: string; classId: string | null; rows: ProfileSubject[]; totals: number[] }>();
  for (const r of results) {
    const se = r.session ?? "—";
    const t = r.term ?? "—";
    const key = `${se}__${t}`;
    const g = termMap.get(key) ?? { session: se, term: t, classId: r.classId, rows: [], totals: [] };
    g.rows.push({ subject: r.subject.name, ca1: r.ca1 ?? 0, ca2: r.ca2 ?? 0, exam: r.exam ?? 0, total: r.total ?? 0, grade: r.grade ?? "-" });
    if (r.total != null) g.totals.push(r.total);
    termMap.set(key, g);
  }
  const terms: TermRecord[] = [...termMap.values()]
    .map((g) => {
      const c = g.classId ? classById.get(g.classId) : null;
      const levelLabel = c?.level?.label || c?.level?.name || c?.name || "—";
      const { position, classSize } = rankIn(g.classId, g.session, g.term);
      g.rows.sort((a, b) => a.subject.localeCompare(b.subject));
      return {
        session: g.session,
        term: g.term,
        termLabel: TERM_LABEL[g.term] ?? g.term,
        levelLabel,
        arm: c?.arm ?? null,
        className: c ? (c.arm ? `${levelLabel} ${c.arm}` : levelLabel) : "—",
        subjects: g.rows,
        average: g.totals.length ? Math.round(g.totals.reduce((a, b) => a + b, 0) / g.totals.length) : 0,
        position,
        classSize,
      };
    })
    .sort((a, b) => (a.session === b.session ? (TERM_ORDER[a.term] ?? 9) - (TERM_ORDER[b.term] ?? 9) : b.session.localeCompare(a.session)));

  // Current term = the school's active session/term (else the latest on record).
  const current = terms.find((t) => t.session === school?.session && t.term === school?.term) ?? terms[0] ?? null;
  const subjects: ProfileSubject[] = current?.subjects ?? [];
  const average = current?.average ?? 0;
  const position = current?.position ?? 0;
  const classSize = current?.classSize ?? 0;
  const currentLabel = current ? `${current.termLabel} · ${current.session}` : "";

  const totalDays = attendance.length;
  const present = attendance.filter((a) => a.status === "PRESENT").length;
  const late = attendance.filter((a) => a.status === "LATE").length;
  const absent = attendance.filter((a) => a.status === "ABSENT").length;
  const rate = totalDays ? Math.round(((present + late) / totalDays) * 100) : 0;
  const recent = attendance.slice(0, 10).reverse().map((a) => (a.status === "PRESENT" ? "present" : a.status === "LATE" ? "late" : "absent")) as ("present" | "late" | "absent")[];

  const ledger = invoices.map((inv) => {
    const paid = inv.payments.reduce((a, p) => a + p.amount, 0);
    const m = inv.payments[0];
    return { term: `${TERM_LABEL[inv.term] ?? inv.term} ${inv.session}`, due: inv.total, paid, method: m?.method ?? "—", date: m ? fmtDay(m.paidAt) : "—" };
  });
  const currentInv = invoices[0];
  const termFee = currentInv?.total ?? 0;
  const paidNow = currentInv ? currentInv.payments.reduce((a, p) => a + p.amount, 0) : 0;
  const outstanding = Math.max(0, termFee - paidNow);

  const history = events.map((e) => ({ title: EVENT_TITLE[e.type] ?? e.type, date: fmtMonth(e.createdAt), meta: e.note ?? "" }));

  const cls = student.class;
  const levelLabel = cls?.level?.label || cls?.name || "";
  const className = cls ? (cls.arm ? `${levelLabel} ${cls.arm}` : levelLabel) : "—";
  const isSenior = (cls?.name ?? "").startsWith("SSS");
  const department = student.department?.name ?? cls?.department?.name ?? null;
  const admYear = student.admissionNo?.match(/(20\d{2})/)?.[1] ?? String(student.createdAt.getFullYear());

  return {
    id: student.id,
    name: `${student.firstName} ${student.lastName}`,
    hue: hueOf(student.id),
    gender: (student.gender as "M" | "F" | null) ?? null,
    dob: student.dob ? fmtDay(student.dob) : "—",
    admissionNo: student.admissionNo,
    className,
    isSenior,
    department,
    status: STATUS_MAP[student.status] ?? "active",
    admittedOn: `Sept ${admYear}`,
    exitedOn: student.statusChangedAt && student.status !== "ACTIVE" ? fmtMonth(student.statusChangedAt) : null,
    leftReason: student.statusReason,
    guardian: student.guardian
      ? { name: student.guardian.name, relation: "Parent / Guardian", phone: student.guardian.phone, email: student.guardian.email }
      : student.guardianName
        ? { name: student.guardianName, relation: "Parent / Guardian", phone: student.guardianPhone, email: null }
        : null,
    academics: { subjects, average, position, classSize, currentLabel, terms },
    attendance: { rate, late, absent, recent },
    fees: { termFee, paid: paidNow, outstanding, ledger },
    history,
    // Owner/HOS/Admin for anyone; a teacher only reaches their own students'
    // profiles, and the transcript action re-checks ownership server-side.
    canGenerateTranscript: canManage(user.role, "transcripts") || user.role === "TEACHER",
  };
}
