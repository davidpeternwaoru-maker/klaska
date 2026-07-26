import "server-only";

// Students — the single source of truth for reading and writing student records.
// Enforces the Permission Matrix (canManageStudents) and schoolId tenant-scoping
// in one place; guardian de-duplication lives here too. Called by the students
// pages (reads) and the students Server Actions (writes).

import { prisma } from "@/lib/db";
import { canManageStudents } from "@/lib/auth/permissions";
import { type Ctx, ServiceError, teacherClassWhere, teacherClassIds } from "@/server/context";
import { toPrisma, paged, type PageInput, type Paged } from "@/lib/paginate";

export type StudentInput = {
  firstName: string;
  lastName: string;
  gender?: string | null;
  classId?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  dob?: string | null; // ISO yyyy-mm-dd
  admissionNo?: string | null;
};

export type StudentRow = {
  id: string;
  name: string;
  admissionNo: string | null;
  gender: string | null;
  classId: string | null;
  className: string | null;
};

export type StudentManageRow = {
  id: string;
  firstName: string;
  lastName: string;
  admissionNo: string | null;
  gender: string | null;
  dob: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  classId: string | null;
  className: string | null;
};

export type ImportRow = {
  firstName: string;
  lastName: string;
  gender?: string | null;
  dob?: string | null;
  admissionNo?: string | null;
  className?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
};
export type ImportResult = { created: number; classesCreated: string[]; skipped: number };

const requireManage = (ctx: Ctx) => {
  if (!canManageStudents(ctx.role)) throw new ServiceError("Your role can view students but not edit records.");
};
const classLabel = (c: { name: string; arm: string | null }) => (c.arm ? `${c.name} ${c.arm}` : c.name);
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

async function nextAdmissionNo(schoolId: string): Promise<string> {
  const count = await prisma.student.count({ where: { schoolId } });
  return `KLK-${String(count + 1).padStart(4, "0")}`;
}

async function assertClassBelongs(schoolId: string, classId: string | null | undefined) {
  if (!classId) return;
  const ok = await prisma.class.findFirst({ where: { id: classId, schoolId }, select: { id: true } });
  if (!ok) throw new ServiceError("Selected class was not found.", "INVALID");
}

// ── guardian decoupling (one parent, many kids) ─────────────────────────────
function phoneKeyOf(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length < 7 ? null : digits.slice(-10);
}

async function resolveGuardian(schoolId: string, name: string | null, phone: string | null, email?: string | null): Promise<string | null> {
  const key = phoneKeyOf(phone);
  const mail = email?.trim().toLowerCase() || null;
  if (!key && !mail) return null;
  const existing = await prisma.guardian.findFirst({
    where: { schoolId, OR: [...(key ? [{ phoneKey: key }] : []), ...(mail ? [{ email: mail }] : [])] },
  });
  if (existing) return existing.id;
  const created = await prisma.guardian.create({
    data: { schoolId, name: name?.trim() || "Guardian", phone: phone?.trim() || null, phoneKey: key, email: mail },
  });
  return created.id;
}

export const studentsService = {
  /** All students visible to the ctx (teachers → their own classes only). */
  async list(ctx: Ctx): Promise<StudentRow[]> {
    // Teachers see students in the classes they OWN or TEACH; leadership sees all.
    const ids = await teacherClassIds(ctx);
    const rows = await prisma.student.findMany({
      where: ids === null ? { schoolId: ctx.schoolId } : { schoolId: ctx.schoolId, classId: { in: ids } },
      include: { class: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
    return rows.map((s) => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      admissionNo: s.admissionNo,
      gender: s.gender,
      classId: s.classId,
      className: s.class ? classLabel(s.class) : null,
    }));
  },

  /** Paginated students (bounded response) — the shape list endpoints/API use so
   *  results never grow unbounded. Same tenant + teacher scoping as list(). */
  async listPage(ctx: Ctx, input: PageInput): Promise<Paged<StudentRow>> {
    const ids = await teacherClassIds(ctx);
    const where = ids === null ? { schoolId: ctx.schoolId } : { schoolId: ctx.schoolId, classId: { in: ids } };
    const [rows, total] = await Promise.all([
      prisma.student.findMany({ where, include: { class: true }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }], ...toPrisma(input) }),
      prisma.student.count({ where }),
    ]);
    return paged(
      rows.map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}`, admissionNo: s.admissionNo, gender: s.gender, classId: s.classId, className: s.class ? classLabel(s.class) : null })),
      total,
      input,
    );
  },

  /** Full editable rows for the "manage students" screen (managers only). */
  async manageRows(ctx: Ctx): Promise<{ students: StudentManageRow[]; classes: { id: string; label: string }[] }> {
    requireManage(ctx);
    const [students, classes] = await Promise.all([
      prisma.student.findMany({ where: { schoolId: ctx.schoolId }, include: { class: true }, orderBy: { createdAt: "desc" } }),
      prisma.class.findMany({ where: { schoolId: ctx.schoolId }, orderBy: [{ name: "asc" }, { arm: "asc" }] }),
    ]);
    return {
      students: students.map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        admissionNo: s.admissionNo,
        gender: s.gender,
        dob: s.dob ? s.dob.toISOString().slice(0, 10) : null,
        guardianName: s.guardianName,
        guardianPhone: s.guardianPhone,
        classId: s.classId,
        className: s.class ? classLabel(s.class) : null,
      })),
      classes: classes.map((c) => ({ id: c.id, label: classLabel(c) })),
    };
  },

  /** Class labels (both "Name Arm" and "Name") for matching a spreadsheet import. */
  async importClassLabels(ctx: Ctx): Promise<string[]> {
    const classes = await prisma.class.findMany({ where: { schoolId: ctx.schoolId } });
    return classes.flatMap((c) => [classLabel(c), c.name]);
  },

  /** Classes selectable for this ctx (teachers → their own). */
  async classes(ctx: Ctx): Promise<{ id: string; label: string }[]> {
    const rows = await prisma.class.findMany({ where: await teacherClassWhere(ctx), orderBy: [{ name: "asc" }, { arm: "asc" }] });
    return rows.map((c) => ({ id: c.id, label: classLabel(c) }));
  },

  async create(ctx: Ctx, input: StudentInput): Promise<void> {
    requireManage(ctx);
    if (!input.firstName?.trim() || !input.lastName?.trim()) throw new ServiceError("First and last name are required.", "INVALID");
    await assertClassBelongs(ctx.schoolId, input.classId);
    try {
      await prisma.student.create({
        data: {
          schoolId: ctx.schoolId,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          admissionNo: input.admissionNo?.trim() || (await nextAdmissionNo(ctx.schoolId)),
          gender: input.gender?.trim() || null,
          dob: input.dob ? new Date(input.dob) : null,
          guardianName: input.guardianName?.trim() || null,
          guardianPhone: input.guardianPhone?.trim() || null,
          guardianId: await resolveGuardian(ctx.schoolId, input.guardianName ?? null, input.guardianPhone ?? null),
          classId: input.classId || null,
        },
      });
    } catch {
      throw new ServiceError("Could not save — that admission number may already be in use.", "INVALID");
    }
  },

  async update(ctx: Ctx, id: string, input: StudentInput): Promise<void> {
    requireManage(ctx);
    if (!id) throw new ServiceError("Missing student id.", "INVALID");
    if (!input.firstName?.trim() || !input.lastName?.trim()) throw new ServiceError("First and last name are required.", "INVALID");
    await assertClassBelongs(ctx.schoolId, input.classId);
    // schoolId in the filter guarantees cross-tenant edits are impossible.
    const res = await prisma.student.updateMany({
      where: { id, schoolId: ctx.schoolId },
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        gender: input.gender?.trim() || null,
        dob: input.dob ? new Date(input.dob) : null,
        guardianName: input.guardianName?.trim() || null,
        guardianPhone: input.guardianPhone?.trim() || null,
        guardianId: await resolveGuardian(ctx.schoolId, input.guardianName ?? null, input.guardianPhone ?? null),
        classId: input.classId || null,
        ...(input.admissionNo?.trim() ? { admissionNo: input.admissionNo.trim() } : {}),
      },
    });
    if (res.count === 0) throw new ServiceError("Student not found.", "NOT_FOUND");
  },

  async remove(ctx: Ctx, id: string): Promise<void> {
    requireManage(ctx);
    if (id) await prisma.student.deleteMany({ where: { id, schoolId: ctx.schoolId } });
  },

  /** Bulk import; optionally creates classes named in the sheet. */
  async import(ctx: Ctx, rows: ImportRow[], createMissingClasses: boolean): Promise<ImportResult> {
    requireManage(ctx);
    if (!rows?.length) throw new ServiceError("No rows to import.", "INVALID");

    const existing = await prisma.class.findMany({ where: { schoolId: ctx.schoolId } });
    const classByLabel = new Map<string, string>();
    for (const c of existing) {
      classByLabel.set(norm(classLabel(c)), c.id);
      classByLabel.set(norm(c.name), c.id);
    }
    const classesCreated: string[] = [];
    const resolveClass = async (label?: string | null): Promise<string | null> => {
      if (!label?.trim()) return null;
      const key = norm(label);
      const hit = classByLabel.get(key);
      if (hit) return hit;
      if (!createMissingClasses) return null;
      const created = await prisma.class.create({ data: { schoolId: ctx.schoolId, name: label.trim() } });
      classByLabel.set(key, created.id);
      classesCreated.push(label.trim());
      return created.id;
    };

    const valid = rows.filter((r) => r.firstName?.trim() && r.lastName?.trim());
    const skipped = rows.length - valid.length;

    const gCache = new Map<string, string | null>();
    const guardianFor = async (name: string | null | undefined, phone: string | null | undefined): Promise<string | null> => {
      const key = phoneKeyOf(phone) ?? "";
      if (!key) return null;
      if (gCache.has(key)) return gCache.get(key)!;
      const gid = await resolveGuardian(ctx.schoolId, name ?? null, phone ?? null);
      gCache.set(key, gid);
      return gid;
    };

    let nextNo = (await prisma.student.count({ where: { schoolId: ctx.schoolId } })) + 1;
    const data = [];
    for (const r of valid) {
      data.push({
        schoolId: ctx.schoolId,
        firstName: r.firstName.trim(),
        lastName: r.lastName.trim(),
        admissionNo: r.admissionNo?.trim() || `KLK-${String(nextNo++).padStart(4, "0")}`,
        gender: r.gender?.trim() || null,
        dob: r.dob ? new Date(r.dob) : null,
        guardianName: r.guardianName?.trim() || null,
        guardianPhone: r.guardianPhone?.trim() || null,
        guardianId: await guardianFor(r.guardianName, r.guardianPhone),
        classId: await resolveClass(r.className),
      });
    }

    try {
      const res = await prisma.student.createMany({ data, skipDuplicates: true });
      return { created: res.count, classesCreated, skipped };
    } catch {
      throw new ServiceError("Saving failed — check for duplicate admission numbers in the file.", "INVALID");
    }
  },
};
