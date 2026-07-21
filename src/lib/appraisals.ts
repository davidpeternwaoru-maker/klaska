import "server-only";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/jwt";
import { buildAppraisal, raterByline, type Appraisal, type AppraisalStaff, type RaterEntry, type RaterId } from "@/lib/appraisals/config";

const hueOf = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};
const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const TERM_LABEL: Record<string, string> = { FIRST: "First Term", SECOND: "Second Term", THIRD: "Third Term" };

export type AppraisalMeta = { school: string; term: string; session: string; cycle: string; principalName: string };

type ApprRow = { raterRole: string; comment: string | null; updatedAt: Date; scores: { competency: string; score: number }[] };

async function getPrincipalName(schoolId: string): Promise<string> {
  const hos = await prisma.staff.findFirst({ where: { schoolId, role: "HOS" }, select: { name: true } });
  if (hos) return hos.name;
  const owner = await prisma.staff.findFirst({ where: { schoolId, role: "OWNER" }, select: { name: true } });
  return owner?.name ?? "The Principal";
}

function buildFromRows(staff: AppraisalStaff, rows: ApprRow[], principal: string): Appraisal {
  const entries: Record<RaterId, RaterEntry | null> = { self: null, peer: null, head: null, principal: null };
  let signed: { by: string; date: string } | null = null;
  for (const r of rows) {
    if (r.raterRole === "signoff") {
      signed = { by: r.comment ?? principal, date: fmt(r.updatedAt) };
      continue;
    }
    if (r.raterRole === "self" || r.raterRole === "peer" || r.raterRole === "head" || r.raterRole === "principal") {
      const ratings: Record<string, number> = {};
      r.scores.forEach((s) => (ratings[s.competency] = s.score));
      entries[r.raterRole] = { ratings, comment: r.comment ?? "", by: raterByline(staff, r.raterRole, principal), date: fmt(r.updatedAt) };
    }
  }
  return buildAppraisal(staff, entries, signed);
}

async function meta(schoolId: string, principal: string): Promise<AppraisalMeta> {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true, term: true, session: true } });
  const termLabel = school?.term ? TERM_LABEL[school.term] ?? school.term : "";
  return { school: school?.name ?? "Your school", term: termLabel, session: school?.session ?? "", cycle: `${termLabel} · ${school?.session ?? ""}`.trim(), principalName: principal };
}

/** The whole appraisal board (Owner/HOS: all staff; HOD: teaching staff). */
export async function getAppraisalsBoard(user: SessionUser): Promise<{ board: Appraisal[]; meta: AppraisalMeta }> {
  const principal = await getPrincipalName(user.schoolId);
  const isHOD = user.role === "HOD";
  const staff = await prisma.staff.findMany({
    where: { schoolId: user.schoolId, ...(isHOD ? { role: { in: ["TEACHER", "HOD"] } } : { role: { not: "OWNER" } }) },
    orderBy: { name: "asc" },
    include: { appraisalsReceived: { include: { scores: true } } },
  });
  const board = staff.map((s) =>
    buildFromRows({ id: s.id, name: s.name, role: s.role, department: s.title ?? null, hue: hueOf(s.id) }, s.appraisalsReceived, principal),
  );
  return { board, meta: await meta(user.schoolId, principal) };
}

/** A single staff member's own appraisal (for the teacher "My appraisal" view). */
export async function getOwnAppraisal(user: SessionUser): Promise<{ appraisal: Appraisal; meta: AppraisalMeta }> {
  const principal = await getPrincipalName(user.schoolId);
  const me = await prisma.staff.findUnique({ where: { id: user.staffId }, include: { appraisalsReceived: { include: { scores: true } } } });
  const staff: AppraisalStaff = me
    ? { id: me.id, name: me.name, role: me.role, department: me.title ?? null, hue: hueOf(me.id) }
    : { id: user.staffId, name: user.name, role: user.role, department: null, hue: hueOf(user.staffId) };
  const appraisal = buildFromRows(staff, me?.appraisalsReceived ?? [], principal);
  return { appraisal, meta: await meta(user.schoolId, principal) };
}
