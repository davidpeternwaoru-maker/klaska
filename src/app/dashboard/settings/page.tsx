import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SectionTitle } from "@/components/ui/primitives";
import { SettingsTabs } from "@/components/dashboard/SettingsTabs";
import type { WizardBand } from "@/components/onboarding/types";

export default async function SettingsPage() {
  const user = await requireUser();
  const school = await prisma.school.findUnique({ where: { id: user.schoolId } });
  if (!school) return null;

  const [bands, fees] = await Promise.all([
    prisma.gradingBand.findMany({ where: { schoolId: user.schoolId }, orderBy: [{ category: "asc" }, { order: "asc" }] }),
    prisma.feeItem.findMany({ where: { schoolId: user.schoolId }, orderBy: { order: "asc" } }),
  ]);
  const grading: Record<string, WizardBand[]> = {};
  for (const b of bands) (grading[b.category] = grading[b.category] || []).push({ label: b.label, minScore: b.minScore, maxScore: b.maxScore, remark: b.remark });

  return (
    <div className="mx-auto max-w-[900px]">
      <SectionTitle eyebrow="School" title="Settings" sub="Update your school profile, sections, grading and fees anytime." />
      <SettingsTabs
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
        grading={grading}
        fees={fees.map((f) => ({ name: f.name, amount: f.amount, appliesTo: f.appliesTo, mandatory: f.mandatory }))}
      />
    </div>
  );
}
