import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import type { WizardBand } from "@/components/onboarding/types";

export const metadata = { title: "Set up your school · Klaska" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const school = await prisma.school.findUnique({ where: { id: user.schoolId } });
  if (!school) return null;

  const [classes, bands, fees, staff] = await Promise.all([
    prisma.class.findMany({ where: { schoolId: user.schoolId }, orderBy: [{ name: "asc" }, { arm: "asc" }] }),
    prisma.gradingBand.findMany({ where: { schoolId: user.schoolId }, orderBy: [{ category: "asc" }, { order: "asc" }] }),
    prisma.feeItem.findMany({ where: { schoolId: user.schoolId }, orderBy: { order: "asc" } }),
    prisma.staff.findMany({ where: { schoolId: user.schoolId }, orderBy: { createdAt: "asc" } }),
  ]);

  const grading: Record<string, WizardBand[]> = {};
  for (const b of bands) {
    (grading[b.category] = grading[b.category] || []).push({ label: b.label, minScore: b.minScore, maxScore: b.maxScore, remark: b.remark });
  }

  return (
    <OnboardingWizard
      ownerName={user.name}
      school={{
        name: school.name,
        shortName: school.shortName,
        motto: school.motto,
        address: school.address,
        email: school.email,
        phone: school.phone,
        logoUrl: school.logoUrl,
        sections: school.sections,
      }}
      classes={classes.map((c) => ({ id: c.id, name: c.name, arm: c.arm }))}
      grading={grading}
      fees={fees.map((f) => ({ name: f.name, amount: f.amount, appliesTo: f.appliesTo, mandatory: f.mandatory }))}
      staff={staff.map((s) => ({ id: s.id, name: s.name, email: s.email, role: s.role }))}
    />
  );
}
