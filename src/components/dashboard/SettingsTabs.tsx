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
import { SettingsClasses, type SettingsClassRow } from "./SettingsClasses";
import { FeePrefs } from "./FeePrefs";
import { StaffManager, type StaffRow } from "./StaffManager";
import type { WizardSchool, WizardClass, WizardBand, WizardFeeItem, WizardFeeAmounts } from "@/components/onboarding/types";

export type TermInfo = { session: string | null; term: string | null; termStart: string | null; termEnd: string | null };

const ALL_TABS = [
  { value: "profile", label: "Profile & branding" },
  { value: "term", label: "Session & term" },
  { value: "sections", label: "Sections" },
  { value: "classes", label: "Classes & arms" },
  { value: "grading", label: "Grading" },
  { value: "fees", label: "Fees" },
  { value: "access", label: "Roles & access" },
];
// Matrix SS5: Owner Full · HOS Limited (academic setup) · Bursar Fee setup.
const TABS_FOR: Record<string, string[]> = {
  OWNER: ["profile", "term", "sections", "classes", "grading", "fees", "access"],
  HOS: ["term", "classes", "grading"],
  BURSAR: ["fees"],
};

export function SettingsTabs({
  school,
  grading,
  classes,
  classRows,
  staff,
  feeItems,
  feeAmounts,
  feePrefs,
  termInfo,
  role = "OWNER",
}: {
  school: WizardSchool;
  grading: Record<string, WizardBand[]>;
  classes: WizardClass[];
  classRows: SettingsClassRow[];
  staff: StaffRow[];
  feeItems: WizardFeeItem[];
  feeAmounts: WizardFeeAmounts;
  feePrefs: { feeCollection: string; autoFeeReminders: boolean };
  termInfo: TermInfo;
  role?: "OWNER" | "HOS" | "BURSAR" | "HOD" | "TEACHER" | "ADMIN";
}) {
  const [tab, setTab] = useState(() => (TABS_FOR[role] ?? ["profile"])[0]);
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
          tabs={ALL_TABS.filter((t) => TABS_FOR[role]?.includes(t.value) ?? t.value === "profile")}
        />
        {saved && <span className="text-[12.5px] font-medium text-green">Saved ✓</span>}
      </div>
      <div className="mt-4">
        {tab === "profile" && <ProfileStep school={school} onDone={done} ctaLabel="Save changes" />}
        {tab === "term" && <TermSettings initial={termInfo} onDone={done} />}
        {tab === "sections" && <StructureStep sections={school.sections} onDone={done} ctaLabel="Save changes" />}
        {tab === "classes" && <SettingsClasses classes={classRows} />}
        {tab === "grading" && <GradingStep sections={school.sections} existing={grading} onDone={done} ctaLabel="Save changes" />}
        {tab === "fees" && (
          <>
            <FeePrefs initial={feePrefs} />
            <FeesStep classes={classes} items={feeItems} amounts={feeAmounts} onDone={done} ctaLabel="Save changes" />
          </>
        )}
        {tab === "access" && <StaffManager staff={staff} />}
      </div>
    </div>
  );
}
