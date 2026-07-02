import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SectionTitle } from "@/components/ui/primitives";
import { SettingsTabs } from "@/components/dashboard/SettingsTabs";
import type { WizardBand, WizardFeeAmounts } from "@/components/onboarding/types";

// Real school settings, inside the main (polished) app shell — the settings a
// school actually manages: profile & branding, session & term, sections,
// grading and per-class fees.
export default async function Page() {
  const user = await requireUser();
  const school = await prisma.school.findUnique({ where: { id: user.schoolId } });
  if (!school) return null;

  const [classes, bands, feeItems, classFees] = await Promise.all([
    prisma.class.findMany({ where: { schoolId: user.schoolId }, orderBy: [{ name: "asc" }, { arm: "asc" }] }),
    prisma.gradingBand.findMany({ where: { schoolId: user.schoolId }, orderBy: [{ category: "asc" }, { order: "asc" }] }),
    prisma.feeItem.findMany({ where: { schoolId: user.schoolId }, orderBy: { order: "asc" } }),
    prisma.classFee.findMany({ where: { schoolId: user.schoolId } }),
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

  return (
    <div className="mx-auto max-w-[1000px]">
      <SectionTitle eyebrow="School" title="Settings" sub="Your school profile, session & term, sections, grading and fees — all editable anytime." />
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
        classes={classes.map((c) => ({ id: c.id, name: c.name, arm: c.arm }))}
        feeItems={feeItems.map((f) => ({ name: f.name, mandatory: f.mandatory }))}
        feeAmounts={feeAmounts}
        termInfo={{
          session: school.session,
          term: school.term,
          termStart: school.termStart ? school.termStart.toISOString().slice(0, 10) : null,
          termEnd: school.termEnd ? school.termEnd.toISOString().slice(0, 10) : null,
        }}
      />
    </div>
  );
}
