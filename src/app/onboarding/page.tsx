import { requireCtx } from "@/server/context";
import { setupService } from "@/server/services/setup";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export const metadata = { title: "Set up your school · Klaska" };

export default async function OnboardingPage() {
  const user = await requireCtx();
  const v = await setupService.wizardView(user);
  if (!v) return null;

  return (
    <OnboardingWizard
      ownerName={v.ownerName}
      school={v.school}
      classes={v.classes}
      subjects={v.subjects}
      grading={v.grading}
      feeItems={v.feeItems}
      feeAmounts={v.feeAmounts}
      staff={v.staff}
    />
  );
}
