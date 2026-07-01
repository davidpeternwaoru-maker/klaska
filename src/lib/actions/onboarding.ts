"use server";

// Server actions for the setup wizard / settings. Each saves one part of the
// school's configuration. All are scoped to the logged-in user's school.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { denyUnless, CAN_MANAGE_SCHOOL } from "@/lib/auth/guard";

export type SetupState = { ok?: boolean; error?: string };

export async function saveProfile(data: {
  name: string;
  shortName?: string;
  motto?: string;
  address?: string;
  email?: string;
  phone?: string;
  logoUrl?: string | null;
}): Promise<SetupState> {
  const user = await requireUser();
  const denied = denyUnless(user, ...CAN_MANAGE_SCHOOL);
  if (denied) return denied;
  if (!data.name?.trim()) return { error: "School name is required." };
  if (data.logoUrl && data.logoUrl.length > 700_000) return { error: "That logo is too large — please use an image under ~500 KB." };

  await prisma.school.update({
    where: { id: user.schoolId },
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
  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function saveSections(sections: string[]): Promise<SetupState> {
  const user = await requireUser();
  const denied = denyUnless(user, ...CAN_MANAGE_SCHOOL);
  if (denied) return denied;
  const allowed = ["EARLY", "PRIMARY", "JUNIOR", "SENIOR"];
  const clean = sections.filter((s) => allowed.includes(s));
  if (clean.length === 0) return { error: "Pick at least one section your school runs." };
  await prisma.school.update({ where: { id: user.schoolId }, data: { sections: clean } });
  revalidatePath("/onboarding");
  return { ok: true };
}

export type ClassLite = { id: string; name: string; arm: string | null };

/** Create classes in bulk from chosen levels + arms (skips ones that exist).
 *  Returns the school's full class list so the wizard's later steps stay fresh. */
export async function createClassesBulk(items: { name: string; arms: string[] }[]): Promise<SetupState & { classes: ClassLite[] }> {
  const user = await requireUser();
  const data: { schoolId: string; name: string; arm: string | null }[] = [];
  for (const it of items) {
    const arms = it.arms.length ? it.arms : [""];
    for (const arm of arms) data.push({ schoolId: user.schoolId, name: it.name, arm: arm || null });
  }
  if (data.length) await prisma.class.createMany({ data, skipDuplicates: true });
  const classes = await prisma.class.findMany({ where: { schoolId: user.schoolId }, orderBy: [{ name: "asc" }, { arm: "asc" }] });
  revalidatePath("/onboarding");
  revalidatePath("/dashboard/classes");
  return { ok: true, classes: classes.map((c) => ({ id: c.id, name: c.name, arm: c.arm })) };
}

export async function saveGrading(
  category: string,
  bands: { label: string; minScore: number; maxScore: number; remark: string }[],
): Promise<SetupState> {
  const user = await requireUser();
  const denied = denyUnless(user, ...CAN_MANAGE_SCHOOL);
  if (denied) return denied;
  const clean = bands.filter((b) => b.label.trim());
  await prisma.$transaction([
    prisma.gradingBand.deleteMany({ where: { schoolId: user.schoolId, category } }),
    prisma.gradingBand.createMany({
      data: clean.map((b, i) => ({
        schoolId: user.schoolId,
        category,
        label: b.label.trim(),
        minScore: Math.max(0, Math.min(100, Math.round(b.minScore))),
        maxScore: Math.max(0, Math.min(100, Math.round(b.maxScore))),
        remark: b.remark.trim(),
        order: i,
      })),
    }),
  ]);
  revalidatePath("/onboarding");
  return { ok: true };
}

/** Save the whole fee structure: the fee types + a per-class amount grid.
 *  `cells` are amounts keyed by fee item name + classId. */
export async function saveFeeStructure(
  items: { name: string; mandatory: boolean }[],
  cells: { itemName: string; classId: string; amount: number }[],
): Promise<SetupState> {
  const user = await requireUser();
  const denied = denyUnless(user, ...CAN_MANAGE_SCHOOL);
  if (denied) return denied;

  const cleanItems = items.filter((i) => i.name.trim());
  // Replace the existing structure (deleting fee items cascades their amounts).
  await prisma.feeItem.deleteMany({ where: { schoolId: user.schoolId } });

  const nameToId = new Map<string, string>();
  for (let idx = 0; idx < cleanItems.length; idx++) {
    const it = cleanItems[idx];
    const created = await prisma.feeItem.create({ data: { schoolId: user.schoolId, name: it.name.trim(), mandatory: it.mandatory, order: idx } });
    nameToId.set(it.name.trim(), created.id);
  }

  const classIds = new Set((await prisma.class.findMany({ where: { schoolId: user.schoolId }, select: { id: true } })).map((c) => c.id));
  const feeData = cells
    .filter((c) => c.amount > 0 && classIds.has(c.classId) && nameToId.has(c.itemName.trim()))
    .map((c) => ({ schoolId: user.schoolId, feeItemId: nameToId.get(c.itemName.trim())!, classId: c.classId, amount: Math.max(0, Math.round(c.amount)) }));
  if (feeData.length) await prisma.classFee.createMany({ data: feeData, skipDuplicates: true });

  revalidatePath("/onboarding");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

/** Mark the wizard finished, then go to the dashboard. */
export async function completeSetup(): Promise<void> {
  const user = await requireUser();
  await prisma.school.update({ where: { id: user.schoolId }, data: { setupCompletedAt: new Date() } });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
