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
  academics: { subjects: ProfileSubject[]; average: number; position: number; classSize: number };
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

  const [results, attendance, invoices, events] = await Promise.all([
    prisma.result.findMany({ where: { studentId: id, schoolId: user.schoolId }, include: { subject: true }, orderBy: { subject: { name: "asc" } } }),
    prisma.attendance.findMany({ where: { studentId: id, schoolId: user.schoolId }, orderBy: { date: "desc" } }),
    prisma.invoice.findMany({ where: { studentId: id, schoolId: user.schoolId }, include: { payments: { orderBy: { paidAt: "desc" } } }, orderBy: { createdAt: "desc" } }),
    prisma.studentEvent.findMany({ where: { studentId: id, schoolId: user.schoolId }, orderBy: { createdAt: "desc" } }),
  ]);

  const subjects: ProfileSubject[] = results.map((r) => ({ subject: r.subject.name, ca1: r.ca1 ?? 0, ca2: r.ca2 ?? 0, exam: r.exam ?? 0, total: r.total ?? 0, grade: r.grade ?? "-" }));
  const average = subjects.length ? Math.round(subjects.reduce((a, b) => a + b.total, 0) / subjects.length) : 0;

  // Class position by term average.
  let position = 0;
  let classSize = 0;
  if (student.classId) {
    const classResults = await prisma.result.findMany({ where: { schoolId: user.schoolId, classId: student.classId }, select: { studentId: true, total: true } });
    const byStudent = new Map<string, { sum: number; n: number }>();
    for (const r of classResults) {
      const e = byStudent.get(r.studentId) ?? { sum: 0, n: 0 };
      e.sum += r.total ?? 0;
      e.n++;
      byStudent.set(r.studentId, e);
    }
    const ranked = [...byStudent.entries()].map(([sid, e]) => ({ sid, avg: e.n ? e.sum / e.n : 0 })).sort((a, b) => b.avg - a.avg);
    classSize = ranked.length;
    const idx = ranked.findIndex((r) => r.sid === id);
    position = idx >= 0 ? idx + 1 : 0;
  }

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
    academics: { subjects, average, position, classSize },
    attendance: { rate, late, absent, recent },
    fees: { termFee, paid: paidNow, outstanding, ledger },
    history,
    canGenerateTranscript: canManage(user.role, "transcripts"),
  };
}
