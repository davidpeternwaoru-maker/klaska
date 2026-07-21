import "server-only";

// School setup — single source of truth for the onboarding wizard and the
// Settings editors: profile, sections, classes, grading, fee structure, term.
// Guards follow the matrix (school = Owner; grading/term = Owner/HOS; fees =
// Owner/Bursar; classes = Owner/HOS).

import { prisma } from "@/lib/db";
import { CAN_MANAGE_SCHOOL } from "@/lib/auth/guard";
import { detectTerm } from "@/lib/terms";
import { canEditAcademicSettings, canEditFeeStructure, canManageClasses } from "@/lib/auth/permissions";
import type { Role } from "@/lib/auth/jwt";
import { type Ctx, ServiceError } from "@/server/context";
import type { WizardBand, WizardFeeAmounts } from "@/components/onboarding/types";

export type ClassLite = { id: string; name: string; arm: string | null };
const classLabel = (c: { name: string; arm: string | null }) => (c.arm ? `${c.name} ${c.arm}` : c.name);

// Exactly the props the SettingsTabs component consumes.
export type SettingsView = {
  school: { name: string; shortName: string | null; motto: string | null; address: string | null; email: string | null; phone: string | null; logoUrl: string | null; sections: string[] };
  grading: Record<string, WizardBand[]>;
  classes: { id: string; name: string; arm: string | null }[];
  classRows: { id: string; name: string; arm: string | null; studentCount: number }[];
  staff: { id: string; name: string; email: string; role: Role; title: string | null; phone: string | null; isSelf: boolean }[];
  feeItems: { name: string; mandatory: boolean }[];
  feeAmounts: WizardFeeAmounts;
  feePrefs: { feeCollection: string; autoFeeReminders: boolean };
  role: Role;
  plan: { tier: string; multiCampus: boolean; campuses: { id: string; name: string; classCount: number }[]; classCampuses: { id: string; label: string; campusId: string | null }[] };
  termInfo: { session: string | null; term: string | null; termStart: string | null; termEnd: string | null };
};

export type WizardView = {
  ownerName: string;
  school: { name: string; shortName: string | null; motto: string | null; address: string | null; email: string | null; phone: string | null; logoUrl: string | null; sections: string[] };
  classes: { id: string; name: string; arm: string | null }[];
  subjects: string[];
  grading: Record<string, WizardBand[]>;
  feeItems: { name: string; mandatory: boolean }[];
  feeAmounts: WizardFeeAmounts;
  staff: { id: string; name: string; email: string; role: Role }[];
};

const requireSchoolAdmin = (ctx: Ctx) => {
  if (!CAN_MANAGE_SCHOOL.includes(ctx.role)) throw new ServiceError("You don't have permission to do that.");
};

export const setupService = {
  async saveProfile(
    ctx: Ctx,
    data: { name: string; shortName?: string; motto?: string; address?: string; email?: string; phone?: string; logoUrl?: string | null },
  ): Promise<void> {
    requireSchoolAdmin(ctx);
    if (!data.name?.trim()) throw new ServiceError("School name is required.", "INVALID");
    if (data.logoUrl && data.logoUrl.length > 700_000) throw new ServiceError("That logo is too large — please use an image under ~500 KB.", "INVALID");
    await prisma.school.update({
      where: { id: ctx.schoolId },
      data: {
        name: data.name.trim(),
        shortName: data.shortName?.trim() || null,
        motto: data.motto?.trim() || null,
        address: data.address?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl || null } : {}),
      },
    });
  },

  async saveSections(ctx: Ctx, sections: string[]): Promise<void> {
    requireSchoolAdmin(ctx);
    const allowed = ["EARLY", "PRIMARY", "JUNIOR", "SENIOR"];
    const clean = sections.filter((s) => allowed.includes(s));
    if (clean.length === 0) throw new ServiceError("Pick at least one section your school runs.", "INVALID");
    await prisma.school.update({ where: { id: ctx.schoolId }, data: { sections: clean } });
  },

  /** Bulk-create classes from chosen levels + arms; returns the full class list. */
  async createClassesBulk(ctx: Ctx, items: { name: string; arms: string[] }[]): Promise<ClassLite[]> {
    if (!canManageClasses(ctx.role)) throw new ServiceError("Only the owner or principal manages classes.");
    const data: { schoolId: string; name: string; arm: string | null }[] = [];
    for (const it of items) {
      const arms = it.arms.length ? it.arms : [""];
      for (const arm of arms) data.push({ schoolId: ctx.schoolId, name: it.name, arm: arm || null });
    }
    if (data.length) await prisma.class.createMany({ data, skipDuplicates: true });
    const classes = await prisma.class.findMany({ where: { schoolId: ctx.schoolId }, orderBy: [{ name: "asc" }, { arm: "asc" }] });
    return classes.map((c) => ({ id: c.id, name: c.name, arm: c.arm }));
  },

  async saveGrading(ctx: Ctx, category: string, bands: { label: string; minScore: number; maxScore: number; remark: string }[]): Promise<void> {
    if (!canEditAcademicSettings(ctx.role)) throw new ServiceError("Only the owner or principal edits grading.");
    const clean = bands.filter((b) => b.label.trim());
    await prisma.$transaction([
      prisma.gradingBand.deleteMany({ where: { schoolId: ctx.schoolId, category } }),
      prisma.gradingBand.createMany({
        data: clean.map((b, i) => ({
          schoolId: ctx.schoolId,
          category,
          label: b.label.trim(),
          minScore: Math.max(0, Math.min(100, Math.round(b.minScore))),
          maxScore: Math.max(0, Math.min(100, Math.round(b.maxScore))),
          remark: b.remark.trim(),
          order: i,
        })),
      }),
    ]);
  },

  /** Replace the whole fee structure: fee types + per-class amount grid. */
  async saveFeeStructure(ctx: Ctx, items: { name: string; mandatory: boolean }[], cells: { itemName: string; classId: string; amount: number }[]): Promise<void> {
    if (!canEditFeeStructure(ctx.role)) throw new ServiceError("Only the owner or bursar edits the fee structure.");
    const cleanItems = items.filter((i) => i.name.trim());
    await prisma.feeItem.deleteMany({ where: { schoolId: ctx.schoolId } }); // cascades amounts

    const nameToId = new Map<string, string>();
    for (let idx = 0; idx < cleanItems.length; idx++) {
      const it = cleanItems[idx];
      const created = await prisma.feeItem.create({ data: { schoolId: ctx.schoolId, name: it.name.trim(), mandatory: it.mandatory, order: idx } });
      nameToId.set(it.name.trim(), created.id);
    }

    const classIds = new Set((await prisma.class.findMany({ where: { schoolId: ctx.schoolId }, select: { id: true } })).map((c) => c.id));
    const feeData = cells
      .filter((c) => c.amount > 0 && classIds.has(c.classId) && nameToId.has(c.itemName.trim()))
      .map((c) => ({ schoolId: ctx.schoolId, feeItemId: nameToId.get(c.itemName.trim())!, classId: c.classId, amount: Math.max(0, Math.round(c.amount)) }));
    if (feeData.length) await prisma.classFee.createMany({ data: feeData, skipDuplicates: true });
  },

  async saveTermInfo(ctx: Ctx, data: { session: string; term: string; termStart?: string; termEnd?: string }): Promise<void> {
    if (!canEditAcademicSettings(ctx.role)) throw new ServiceError("Only the owner or principal edits the term.");
    if (!/^\d{4}\/\d{4}$/.test(data.session.trim())) throw new ServiceError("Session should look like 2025/2026.", "INVALID");
    if (!["FIRST", "SECOND", "THIRD"].includes(data.term)) throw new ServiceError("Pick a term.", "INVALID");
    const start = data.termStart ? new Date(data.termStart) : null;
    const end = data.termEnd ? new Date(data.termEnd) : null;
    if (start && end && start >= end) throw new ServiceError("Term start must be before term end.", "INVALID");
    await prisma.school.update({ where: { id: ctx.schoolId }, data: { session: data.session.trim(), term: data.term, termStart: start, termEnd: end } });
  },

  /** Everything the Settings screen edits (profile, term, sections, grading, fees, plan). */
  async settingsView(ctx: Ctx): Promise<SettingsView | null> {
    const school = await prisma.school.findUnique({ where: { id: ctx.schoolId } });
    if (!school) return null;

    const [classes, bands, feeItems, classFees, staff, campuses] = await Promise.all([
      prisma.class.findMany({ where: { schoolId: ctx.schoolId }, include: { _count: { select: { students: true } } }, orderBy: [{ name: "asc" }, { arm: "asc" }] }),
      prisma.gradingBand.findMany({ where: { schoolId: ctx.schoolId }, orderBy: [{ category: "asc" }, { order: "asc" }] }),
      prisma.feeItem.findMany({ where: { schoolId: ctx.schoolId }, orderBy: { order: "asc" } }),
      prisma.classFee.findMany({ where: { schoolId: ctx.schoolId } }),
      prisma.staff.findMany({ where: { schoolId: ctx.schoolId }, orderBy: { createdAt: "asc" } }),
      prisma.campus.findMany({ where: { schoolId: ctx.schoolId }, include: { _count: { select: { classes: true } } }, orderBy: { name: "asc" } }),
    ]);

    const grading: Record<string, WizardBand[]> = {};
    for (const b of bands) (grading[b.category] = grading[b.category] || []).push({ label: b.label, minScore: b.minScore, maxScore: b.maxScore, remark: b.remark });

    const feeIdToName = new Map(feeItems.map((f) => [f.id, f.name]));
    const feeAmounts: WizardFeeAmounts = {};
    for (const cf of classFees) {
      const name = feeIdToName.get(cf.feeItemId);
      if (!name) continue;
      (feeAmounts[name] = feeAmounts[name] || {})[cf.classId] = cf.amount;
    }

    return {
      school: { name: school.name, shortName: school.shortName, motto: school.motto, address: school.address, email: school.email, phone: school.phone, logoUrl: school.logoUrl, sections: school.sections },
      grading,
      classes: classes.map((c) => ({ id: c.id, name: c.name, arm: c.arm })),
      classRows: classes.map((c) => ({ id: c.id, name: c.name, arm: c.arm, studentCount: c._count.students })),
      staff: staff.map((s) => ({ id: s.id, name: s.name, email: s.email, role: s.role, title: s.title, phone: s.phone, isSelf: s.id === ctx.staffId })),
      feeItems: feeItems.map((f) => ({ name: f.name, mandatory: f.mandatory })),
      feeAmounts,
      feePrefs: { feeCollection: school.feeCollection, autoFeeReminders: school.autoFeeReminders },
      role: ctx.role,
      plan: {
        tier: school.tier,
        multiCampus: school.multiCampus,
        campuses: campuses.map((c) => ({ id: c.id, name: c.name, classCount: c._count.classes })),
        classCampuses: classes.map((c) => ({ id: c.id, label: classLabel(c), campusId: c.campusId })),
      },
      termInfo: {
        session: school.session,
        term: school.term,
        termStart: school.termStart ? school.termStart.toISOString().slice(0, 10) : null,
        termEnd: school.termEnd ? school.termEnd.toISOString().slice(0, 10) : null,
      },
    };
  },

  /** Everything the onboarding wizard needs (a superset of the school config). */
  async wizardView(ctx: Ctx): Promise<WizardView | null> {
    const school = await prisma.school.findUnique({ where: { id: ctx.schoolId } });
    if (!school) return null;

    const [classes, bands, feeItems, classFees, staff, subjects] = await Promise.all([
      prisma.class.findMany({ where: { schoolId: ctx.schoolId }, orderBy: [{ name: "asc" }, { arm: "asc" }] }),
      prisma.gradingBand.findMany({ where: { schoolId: ctx.schoolId }, orderBy: [{ category: "asc" }, { order: "asc" }] }),
      prisma.feeItem.findMany({ where: { schoolId: ctx.schoolId }, orderBy: { order: "asc" } }),
      prisma.classFee.findMany({ where: { schoolId: ctx.schoolId } }),
      prisma.staff.findMany({ where: { schoolId: ctx.schoolId }, orderBy: { createdAt: "asc" } }),
      prisma.subject.findMany({ where: { schoolId: ctx.schoolId }, select: { name: true } }),
    ]);

    const grading: Record<string, WizardBand[]> = {};
    for (const b of bands) (grading[b.category] = grading[b.category] || []).push({ label: b.label, minScore: b.minScore, maxScore: b.maxScore, remark: b.remark });

    const feeIdToName = new Map(feeItems.map((f) => [f.id, f.name]));
    const feeAmounts: WizardFeeAmounts = {};
    for (const cf of classFees) {
      const name = feeIdToName.get(cf.feeItemId);
      if (!name) continue;
      (feeAmounts[name] = feeAmounts[name] || {})[cf.classId] = cf.amount;
    }

    return {
      ownerName: ctx.name,
      school: { name: school.name, shortName: school.shortName, motto: school.motto, address: school.address, email: school.email, phone: school.phone, logoUrl: school.logoUrl, sections: school.sections },
      classes: classes.map((c) => ({ id: c.id, name: c.name, arm: c.arm })),
      subjects: subjects.map((s) => s.name),
      grading,
      feeItems: feeItems.map((f) => ({ name: f.name, mandatory: f.mandatory })),
      feeAmounts,
      staff: staff.map((s) => ({ id: s.id, name: s.name, email: s.email, role: s.role })),
    };
  },

  /** Mark the wizard finished (auto-detecting session/term if unset). */
  async completeSetup(ctx: Ctx): Promise<void> {
    const school = await prisma.school.findUnique({ where: { id: ctx.schoolId }, select: { session: true } });
    const t = detectTerm();
    await prisma.school.update({
      where: { id: ctx.schoolId },
      data: { setupCompletedAt: new Date(), ...(school?.session ? {} : { session: t.session, term: t.term, termStart: t.termStart, termEnd: t.termEnd }) },
    });
  },
};
