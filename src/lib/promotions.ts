import "server-only";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/jwt";

// Canonical progression ladder.
export const LEVEL_ORDER = [
  "Crèche", "KG 1", "KG 2", "Nursery 1", "Nursery 2",
  "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
  "JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3",
];
export function nextLevel(level: string): string {
  const i = LEVEL_ORDER.indexOf(level);
  if (i < 0) return level;
  return i >= LEVEL_ORDER.length - 1 ? "Graduated" : LEVEL_ORDER[i + 1];
}

const hueOf = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

export type PromoStudent = { id: string; name: string; hue: number; level: string; arm: string | null };
export type PromoClass = { classId: string; klass: string; teacher: string; count: number; avg: number; atRisk: number; eligible: number; next: string; students: PromoStudent[] };
export type PromotionsData = { classes: PromoClass[]; totalActive: number; eligible: number; toReview: number; graduating: number; session: string };

/** Build the promotions board from live data: active students per class, class
 *  averages (from saved results), at-risk flags, and each class's next level. */
export async function getPromotionsData(user: SessionUser): Promise<PromotionsData> {
  const school = await prisma.school.findUnique({ where: { id: user.schoolId }, select: { session: true } });
  const [classes, results] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId: user.schoolId },
      include: { teacher: { select: { name: true } }, students: { where: { status: "ACTIVE" }, select: { id: true, firstName: true, lastName: true } } },
    }),
    prisma.result.findMany({ where: { schoolId: user.schoolId }, select: { studentId: true, total: true } }),
  ]);

  const byStudent = new Map<string, { sum: number; n: number }>();
  for (const r of results) {
    const e = byStudent.get(r.studentId) ?? { sum: 0, n: 0 };
    e.sum += r.total ?? 0;
    e.n++;
    byStudent.set(r.studentId, e);
  }
  const studentAvg = (id: string) => {
    const e = byStudent.get(id);
    return e && e.n ? Math.round(e.sum / e.n) : 0;
  };

  const withStudents = classes.filter((c) => c.students.length > 0);
  withStudents.sort((a, b) => {
    const d = LEVEL_ORDER.indexOf(a.name) - LEVEL_ORDER.indexOf(b.name);
    return d !== 0 ? d : (a.arm ?? "").localeCompare(b.arm ?? "");
  });

  const out: PromoClass[] = withStudents.map((c) => {
    const students = c.students.map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}`, hue: hueOf(s.id), level: c.name, arm: c.arm }));
    const avgs = students.map((s) => studentAvg(s.id));
    const scored = avgs.filter((a) => a > 0);
    const classAvg = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : 0;
    const atRisk = avgs.filter((a) => a > 0 && a < 50).length;
    return {
      classId: c.id,
      klass: c.arm ? `${c.name} ${c.arm}` : c.name,
      teacher: c.teacher?.name ?? "—",
      count: students.length,
      avg: classAvg,
      atRisk,
      eligible: students.length - atRisk,
      next: nextLevel(c.name),
      students,
    };
  });

  return {
    classes: out,
    totalActive: out.reduce((a, c) => a + c.count, 0),
    eligible: out.reduce((a, c) => a + c.eligible, 0),
    toReview: out.reduce((a, c) => a + c.atRisk, 0),
    graduating: out.filter((c) => c.next === "Graduated").reduce((a, c) => a + c.count, 0),
    session: school?.session ?? "this session",
  };
}

// ── core mutations (no auth — the "use server" actions wrap these) ────────────

async function currentCalendar(schoolId: string) {
  const s = await prisma.school.findUnique({ where: { id: schoolId }, select: { session: true, term: true } });
  return { session: s?.session ?? null, term: s?.term ?? null };
}

/** Find the class a promoted student should land in (same arm, next level), creating it if absent. */
async function ensureTargetClass(schoolId: string, targetLevel: string, arm: string | null) {
  const existing = await prisma.class.findFirst({ where: { schoolId, name: targetLevel, arm } });
  if (existing) return existing;
  const level = await prisma.level.findFirst({ where: { schoolId, name: targetLevel } });
  return prisma.class.create({ data: { schoolId, name: targetLevel, arm, levelId: level?.id ?? null } });
}

export type PromoResult = { ok?: true; count?: number; error?: string };

/** Promote (or repeat) every active student in a class. */
export async function promoteClassCore(schoolId: string, classId: string, mode: "promote" | "repeat"): Promise<PromoResult> {
  const cls = await prisma.class.findFirst({ where: { id: classId, schoolId }, include: { students: { where: { status: "ACTIVE" }, select: { id: true } } } });
  if (!cls) return { error: "Class not found." };
  const ids = cls.students.map((s) => s.id);
  if (ids.length === 0) return { ok: true, count: 0 };
  const { session, term } = await currentCalendar(schoolId);
  const label = cls.arm ? `${cls.name} ${cls.arm}` : cls.name;
  const now = new Date();

  if (mode === "repeat") {
    await prisma.studentEvent.createMany({ data: ids.map((id) => ({ schoolId, studentId: id, type: "REPEATED" as const, session, term, note: `Held back in ${label} for the new session` })) });
    return { ok: true, count: ids.length };
  }

  const target = nextLevel(cls.name);
  if (target === "Graduated") {
    await prisma.$transaction([
      prisma.student.updateMany({ where: { id: { in: ids } }, data: { status: "GRADUATED", statusChangedAt: now } }),
      prisma.enrollment.updateMany({ where: { studentId: { in: ids }, endedAt: null }, data: { endedAt: now } }),
      prisma.studentEvent.createMany({ data: ids.map((id) => ({ schoolId, studentId: id, type: "GRADUATED" as const, session, term, note: "Completed SSS 3 — moved to alumni" })) }),
    ]);
    return { ok: true, count: ids.length };
  }

  const targetClass = await ensureTargetClass(schoolId, target, cls.arm);
  const targetLabel = targetClass.arm ? `${targetClass.name} ${targetClass.arm}` : targetClass.name;
  await prisma.$transaction([
    prisma.student.updateMany({ where: { id: { in: ids } }, data: { classId: targetClass.id } }),
    prisma.enrollment.updateMany({ where: { studentId: { in: ids }, endedAt: null }, data: { endedAt: now } }),
    prisma.enrollment.createMany({ data: ids.map((id) => ({ schoolId, studentId: id, classId: targetClass.id })) }),
    prisma.studentEvent.createMany({ data: ids.map((id) => ({ schoolId, studentId: id, type: "PROMOTED" as const, session, term, note: `${label} → ${targetLabel}` })) }),
  ]);
  return { ok: true, count: ids.length };
}

/** Apply per-student promote/repeat choices (from the review modal). */
export async function promoteStudentsCore(schoolId: string, items: { studentId: string; mode: "promote" | "repeat" }[]): Promise<PromoResult> {
  const { session, term } = await currentCalendar(schoolId);
  const now = new Date();
  let count = 0;
  for (const it of items) {
    const s = await prisma.student.findFirst({ where: { id: it.studentId, schoolId, status: "ACTIVE" }, include: { class: true } });
    if (!s || !s.class) continue;
    const label = s.class.arm ? `${s.class.name} ${s.class.arm}` : s.class.name;
    if (it.mode === "repeat") {
      await prisma.studentEvent.create({ data: { schoolId, studentId: s.id, type: "REPEATED", session, term, note: `Held back in ${label} for the new session` } });
      count++;
      continue;
    }
    const target = nextLevel(s.class.name);
    if (target === "Graduated") {
      await prisma.$transaction([
        prisma.student.update({ where: { id: s.id }, data: { status: "GRADUATED", statusChangedAt: now } }),
        prisma.enrollment.updateMany({ where: { studentId: s.id, endedAt: null }, data: { endedAt: now } }),
        prisma.studentEvent.create({ data: { schoolId, studentId: s.id, type: "GRADUATED", session, term, note: "Completed SSS 3 — moved to alumni" } }),
      ]);
    } else {
      const tc = await ensureTargetClass(schoolId, target, s.class.arm);
      const targetLabel = tc.arm ? `${tc.name} ${tc.arm}` : tc.name;
      await prisma.$transaction([
        prisma.student.update({ where: { id: s.id }, data: { classId: tc.id } }),
        prisma.enrollment.updateMany({ where: { studentId: s.id, endedAt: null }, data: { endedAt: now } }),
        prisma.enrollment.create({ data: { schoolId, studentId: s.id, classId: tc.id } }),
        prisma.studentEvent.create({ data: { schoolId, studentId: s.id, type: "PROMOTED", session, term, note: `${label} → ${targetLabel}` } }),
      ]);
    }
    count++;
  }
  return { ok: true, count };
}

/** End-of-session: promote every class. Processed top level first so a student
 *  is never promoted twice in one run. `modes` overrides per class (default promote). */
export async function runEndOfSessionCore(schoolId: string, modes: Record<string, "promote" | "repeat">): Promise<PromoResult> {
  const classes = await prisma.class.findMany({ where: { schoolId }, select: { id: true, name: true } });
  classes.sort((a, b) => LEVEL_ORDER.indexOf(b.name) - LEVEL_ORDER.indexOf(a.name)); // highest level first
  let count = 0;
  for (const c of classes) {
    const res = await promoteClassCore(schoolId, c.id, modes[c.id] ?? "promote");
    count += res.count ?? 0;
  }
  return { ok: true, count };
}
