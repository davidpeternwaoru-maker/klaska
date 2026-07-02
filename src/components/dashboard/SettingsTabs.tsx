"use client";

// Settings reuses the onboarding step editors in "standalone" mode: each saves
// on its own button (labelled "Save changes") instead of advancing a wizard.

import { useState } from "react";
import { SegTabs } from "@/components/ui/primitives";
import { ProfileStep } from "@/components/onboarding/steps/ProfileStep";
import { StructureStep } from "@/components/onboarding/steps/StructureStep";
import { GradingStep } from "@/components/onboarding/steps/GradingStep";
import { FeesStep } from "@/components/onboarding/steps/FeesStep";
import { TermSettings } from "./TermSettings";
import type { WizardSchool, WizardClass, WizardBand, WizardFeeItem, WizardFeeAmounts } from "@/components/onboarding/types";

export type TermInfo = { session: string | null; term: string | null; termStart: string | null; termEnd: string | null };

export function SettingsTabs({
  school,
  grading,
  classes,
  feeItems,
  feeAmounts,
  termInfo,
}: {
  school: WizardSchool;
  grading: Record<string, WizardBand[]>;
  classes: WizardClass[];
  feeItems: WizardFeeItem[];
  feeAmounts: WizardFeeAmounts;
  termInfo: TermInfo;
}) {
  const [tab, setTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const done = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <SegTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "profile", label: "Profile & branding" },
            { value: "term", label: "Session & term" },
            { value: "sections", label: "Sections" },
            { value: "grading", label: "Grading" },
            { value: "fees", label: "Fees" },
          ]}
        />
        {saved && <span className="text-[12.5px] font-medium text-green">Saved ✓</span>}
      </div>
      <div className="mt-4">
        {tab === "profile" && <ProfileStep school={school} onDone={done} ctaLabel="Save changes" />}
        {tab === "term" && <TermSettings initial={termInfo} onDone={done} />}
        {tab === "sections" && <StructureStep sections={school.sections} onDone={done} ctaLabel="Save changes" />}
        {tab === "grading" && <GradingStep sections={school.sections} existing={grading} onDone={done} ctaLabel="Save changes" />}
        {tab === "fees" && <FeesStep classes={classes} items={feeItems} amounts={feeAmounts} onDone={done} ctaLabel="Save changes" />}
      </div>
    </div>
  );
}
