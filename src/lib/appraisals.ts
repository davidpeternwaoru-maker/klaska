import "server-only";

// Appraisal READS — build the role-scoped board, a staff member's own appraisal,
// and a single teacher's appraisal (with a server-side visibility check). The
// pure scoring lives in ./appraisals/config; writes live in the service.
//
// Visibility (enforced here AND in the service, never just the UI):
//   • Teacher  → only their OWN record; HOD/HOS portions appear only once SUBMITTED.
//   • HOD      → their OWN record + TEACHERS IN THEIR DEPARTMENT only.
//   • HOS/Owner→ every teacher and HOD, all portions.

import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/jwt";
import type { Role } from "@/lib/auth/jwt";
import { canView } from "@/lib/auth/permissions";
import { ServiceError } from "@/server/context";
import {
  buildAppraisal,
  overallOf,
  COMP_IDS,
  type Appraisal,
  type AppraisalStaff,
  type RaterEntry,
  type RaterId,
} from "@/lib/appraisals/config";

const hueOf = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};
const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const TERM_LABEL: Record<string, string> = { FIRST: "First Term", SECOND: "Second Term", THIRD: "Third Term" };

export type AppraisalMeta = { school: string; term: string; session: string; cycle: string };

type ApprRow = {
  raterRole: string;
  comment: string | null;
  status: string;
  updatedAt: Date;
  raterStaff: { name: string } | null;
  scores: { competency: string; score: number; comment: string | null }[];
};

async function calendar(schoolId: string) {
  const s = await prisma.school.findUnique({ where: { id: schoolId }, select: { session: true, term: true } });
  return { session: s?.session ?? null, term: s?.term ?? null };
}

async function meta(schoolId: string): Promise<AppraisalMeta> {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true, term: true, session: true } });
  const termLabel = school?.term ? TERM_LABEL[school.term] ?? school.term : "";
  return { school: school?.name ?? "Your school", term: termLabel, session: school?.session ?? "", cycle: `${termLabel} · ${school?.session ?? ""}`.trim() };
}

/** DB row → a typed reviewer entry (sections keyed by competency, incl. notes). */
function entryFrom(row: ApprRow): RaterEntry {
  const sections: Record<string, { score: number | null; comment: string }> = {};
  for (const id of COMP_IDS) sections[id] = { score: null, comment: "" };
  for (const s of row.scores) if (s.competency in sections) sections[s.competency] = { score: s.score, comment: s.comment ?? "" };
  const rater = (row.raterRole === "hod" || row.raterRole === "hos" ? row.raterRole : "self") as RaterId;
  return {
    rater,
    sections,
    overall: overallOf(sections),
    comment: row.comment ?? "",
    status: row.status === "SUBMITTED" ? "SUBMITTED" : "DRAFT",
    by: row.raterStaff?.name ?? "—",
    date: fmt(row.updatedAt),
  };
}

/** Fold a staff member's rows into an entries map. `onlySubmittedOthers` hides
 *  another reviewer's DRAFT from a teacher looking at their own record. */
function entriesFrom(rows: ApprRow[], onlySubmittedOthers: boolean): Record<RaterId, RaterEntry | null> {
  const entries: Record<RaterId, RaterEntry | null> = { self: null, hod: null, hos: null };
  for (const row of rows) {
    // Ignore any legacy rater roles (peer/head/principal/signoff) from older cycles.
    if (row.raterRole !== "self" && row.raterRole !== "hod" && row.raterRole !== "hos") continue;
    const e = entryFrom(row);
    if (onlySubmittedOthers && e.rater !== "self" && e.status !== "SUBMITTED") continue;
    entries[e.rater] = e;
  }
  return entries;
}

/** Which perspective the viewer may FILL for a given subject (null = read-only).
 *  Exported so the write service enforces exactly the same rule as the read layer. */
export function editableRaterFor(
  viewer: { role: Role; staffId: string; departmentId: string | null },
  subject: { id: string; role: string; departmentId: string | null },
): RaterId | null {
  if (subject.id === viewer.staffId) return viewer.role === "TEACHER" || viewer.role === "HOD" ? "self" : null;
  if (viewer.role === "HOS") return "hos";
  if (viewer.role === "HOD") return subject.role === "TEACHER" && !!viewer.departmentId && subject.departmentId === viewer.departmentId ? "hod" : null;
  return null; // OWNER read-only; TEACHER can't touch others
}

const staffCard = (s: { id: string; name: string; role: string; department: { name: string } | null }): AppraisalStaff => ({
  id: s.id,
  name: s.name,
  role: s.role,
  department: s.department?.name ?? null,
  hue: hueOf(s.id),
});

async function viewerRecord(staffId: string) {
  const v = await prisma.staff.findUnique({ where: { id: staffId }, select: { id: true, role: true, departmentId: true } });
  return { role: (v?.role ?? "TEACHER") as Role, staffId, departmentId: v?.departmentId ?? null };
}

/** The appraisal board for the current viewer: HOS/Owner → all teachers & HODs;
 *  HOD → teachers in their department only. (Teachers never call this.) */
export async function getAppraisalsBoard(user: SessionUser): Promise<{ board: Appraisal[]; meta: AppraisalMeta; viewerDepartment: string | null }> {
  if (!canView(user.role, "appraisals")) throw new ServiceError("You don't have access to appraisals.");
  const viewer = await viewerRecord(user.staffId);
  const { session, term } = await calendar(user.schoolId);
  const isHOD = user.role === "HOD";

  // A HOD with no department heads nobody — fail closed with an empty board.
  if (isHOD && !viewer.departmentId) {
    return { board: [], meta: await meta(user.schoolId), viewerDepartment: null };
  }

  const where = isHOD
    ? { schoolId: user.schoolId, role: "TEACHER" as Role, departmentId: viewer.departmentId }
    : { schoolId: user.schoolId, role: { in: ["TEACHER", "HOD"] as Role[] } };

  const staff = await prisma.staff.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      department: { select: { name: true } },
      appraisalsReceived: {
        where: { session, term },
        include: { scores: true, raterStaff: { select: { name: true } } },
      },
    },
  });

  const board = staff.map((s) => {
    const appraisal = buildAppraisal(staffCard(s), entriesFrom(s.appraisalsReceived as ApprRow[], false));
    appraisal.editableRater = editableRaterFor(viewer, { id: s.id, role: s.role, departmentId: s.departmentId });
    return appraisal;
  });

  const viewerDepartment = isHOD ? (await prisma.department.findUnique({ where: { id: viewer.departmentId! }, select: { name: true } }))?.name ?? null : null;
  return { board, meta: await meta(user.schoolId), viewerDepartment };
}

/** The viewer's OWN appraisal (self always; HOD/HOS shown only once submitted). */
export async function getOwnAppraisal(user: SessionUser): Promise<{ appraisal: Appraisal; meta: AppraisalMeta }> {
  const viewer = await viewerRecord(user.staffId);
  const { session, term } = await calendar(user.schoolId);
  const me = await prisma.staff.findUnique({
    where: { id: user.staffId },
    include: {
      department: { select: { name: true } },
      appraisalsReceived: { where: { session, term }, include: { scores: true, raterStaff: { select: { name: true } } } },
    },
  });
  const card: AppraisalStaff = me
    ? staffCard(me)
    : { id: user.staffId, name: user.name, role: user.role, department: null, hue: hueOf(user.staffId) };
  const appraisal = buildAppraisal(card, entriesFrom((me?.appraisalsReceived as ApprRow[]) ?? [], true));
  appraisal.editableRater = viewer.role === "TEACHER" || viewer.role === "HOD" ? "self" : null;
  return { appraisal, meta: await meta(user.schoolId) };
}

/** A single teacher's appraisal, with the visibility rule enforced HERE. Used by
 *  the read action so a direct call can't leak another teacher's record. */
export async function getTeacherAppraisal(user: SessionUser, staffId: string): Promise<{ appraisal: Appraisal; meta: AppraisalMeta }> {
  if (!canView(user.role, "appraisals")) throw new ServiceError("You don't have access to appraisals.");
  if (user.role === "TEACHER" && staffId !== user.staffId) throw new ServiceError("You can only view your own appraisal.");

  const viewer = await viewerRecord(user.staffId);
  const { session, term } = await calendar(user.schoolId);
  const subject = await prisma.staff.findFirst({
    where: { id: staffId, schoolId: user.schoolId },
    include: {
      department: { select: { name: true } },
      appraisalsReceived: { where: { session, term }, include: { scores: true, raterStaff: { select: { name: true } } } },
    },
  });
  if (!subject) throw new ServiceError("That staff member was not found.", "NOT_FOUND");

  // HOD may see their own + teachers in their department; nobody else.
  if (user.role === "HOD" && subject.id !== user.staffId) {
    const allowed = subject.role === "TEACHER" && !!viewer.departmentId && subject.departmentId === viewer.departmentId;
    if (!allowed) throw new ServiceError("You can only view appraisals for teachers in your department.");
  }

  const isOwnAsTeacher = subject.id === user.staffId && (user.role === "TEACHER" || user.role === "HOD");
  const appraisal = buildAppraisal(staffCard(subject), entriesFrom(subject.appraisalsReceived as ApprRow[], isOwnAsTeacher));
  appraisal.editableRater = editableRaterFor(viewer, { id: subject.id, role: subject.role, departmentId: subject.departmentId });
  return { appraisal, meta: await meta(user.schoolId) };
}
