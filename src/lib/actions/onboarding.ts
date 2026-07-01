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

/** Create classes in bulk from chosen levels + arms (skips ones that exist). */
export async function createClassesBulk(items: { name: string; arms: string[] }[]): Promise<SetupState> {
  const user = await requireUser();
  const data: { schoolId: string; name: string; arm: string | null }[] = [];
  for (const it of items) {
    const arms = it.arms.length ? it.arms : [""];
    for (const arm of arms) data.push({ schoolId: user.schoolId, name: it.name, arm: arm || null });
  }
  if (data.length) await prisma.class.createMany({ data, skipDuplicates: true });
  revalidatePath("/onboarding");
  revalidatePath("/dashboard/classes");
  return { ok: true };
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

export async function saveFees(
  items: { name: string; amount: number; appliesTo?: string; mandatory: boolean }[],
): Promise<SetupState> {
  const user = await requireUser();
  const denied = denyUnless(user, ...CAN_MANAGE_SCHOOL);
  if (denied) return denied;
  const clean = items.filter((i) => i.name.trim());
  await prisma.$transaction([
    prisma.feeItem.deleteMany({ where: { schoolId: user.schoolId } }),
    prisma.feeItem.createMany({
      data: clean.map((i, idx) => ({
        schoolId: user.schoolId,
        name: i.name.trim(),
        amount: Math.max(0, Math.round(i.amount || 0)),
        appliesTo: i.appliesTo || "ALL",
        mandatory: !!i.mandatory,
        order: idx,
      })),
    }),
  ]);
  revalidatePath("/onboarding");
  return { ok: true };
}

/** Mark the wizard finished, then go to the dashboard. */
export async function completeSetup(): Promise<void> {
  const user = await requireUser();
  await prisma.school.update({ where: { id: user.schoolId }, data: { setupCompletedAt: new Date() } });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
