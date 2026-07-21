"use client";

// The setup wizard shown after signup. It walks a new school through
// configuring everything before entering the app. Each step saves its own part
// immediately (so progress is never lost), then advances. A school can also
// come back to /onboarding later to change things (Settings links here too).

import { useState } from "react";
import { KLogo } from "@/components/ui/Icon";
import type { WizardSchool, WizardClass, WizardBand, WizardFeeItem, WizardFeeAmounts, WizardStaff } from "./types";
import { ProfileStep } from "./steps/ProfileStep";
import { StructureStep } from "./steps/StructureStep";
import { ClassesStep } from "./steps/ClassesStep";
import { SubjectsStep } from "./steps/SubjectsStep";
import { StudentsStep } from "./steps/StudentsStep";
import { GradingStep } from "./steps/GradingStep";
import { FeesStep } from "./steps/FeesStep";
import { StaffStep } from "./steps/StaffStep";
import { ReviewStep } from "./steps/ReviewStep";

const STEPS = ["Profile", "Structure", "Classes", "Students", "Staff", "Subjects", "Grading", "Fees", "Review"];

export function OnboardingWizard({
  ownerName,
  school,
  classes,
  subjects,
  grading,
  feeItems,
  feeAmounts,
  staff,
}: {
  ownerName: string;
  school: WizardSchool;
  classes: WizardClass[];
  subjects: string[];
  grading: Record<string, WizardBand[]>;
  feeItems: WizardFeeItem[];
  feeAmounts: WizardFeeAmounts;
  staff: WizardStaff[];
}) {
  const [step, setStep] = useState(0);
  // The wizard owns state that later steps depend on, so each step always gets
  // the fresh value the moment it changes — no waiting on a server refetch.
  const [sections, setSections] = useState<string[]>(school.sections);
  const [classList, setClassList] = useState<WizardClass[]>(classes);
  const [feeSummary, setFeeSummary] = useState(() => ({
    items: feeItems.length,
    total: Object.values(feeAmounts).reduce((s, byClass) => s + Object.values(byClass).reduce((a, b) => a + b, 0), 0),
  }));
  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="min-h-screen bg-secondary">
      <div className="mx-auto max-w-[860px] px-4 py-8">
        {/* header */}
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-card)] bg-forest">
            <KLogo size={22} white />
          </span>
          <div>
            <div className="font-display text-[18px] font-bold tracking-tight text-ink">Set up your school</div>
            <div className="text-[12.5px] text-ink-4">Welcome, {ownerName.split(" ")[0]} — a few steps and you&apos;re ready.</div>
          </div>
          <div className="ml-auto text-[12.5px] font-medium text-ink-4">
            Step {step + 1} of {STEPS.length}
          </div>
        </div>

        {/* stepper */}
        <div className="mb-6 flex items-center gap-1.5">
          {STEPS.map((label, i) => (
            <button
              key={label}
              onClick={() => i <= step && setStep(i)}
              disabled={i > step}
              className="flex flex-1 flex-col gap-1.5 text-left"
              title={label}
            >
              <span className="h-1.5 w-full rounded-full transition-colors" style={{ background: i <= step ? "var(--color-forest)" : "var(--color-line-2)" }} />
              <span className={`text-[11px] font-medium ${i === step ? "text-ink" : "text-ink-4"}`}>{label}</span>
            </button>
          ))}
        </div>

        {/* active step */}
        <div className="k-rise">
          {step === 0 && <ProfileStep school={school} onDone={next} />}
          {step === 1 && <StructureStep sections={sections} onSaved={setSections} onDone={next} />}
          {step === 2 && <ClassesStep key={sections.join(",")} sections={sections} existing={classList} onCreated={setClassList} onDone={next} />}
          {step === 3 && <StudentsStep classes={classList} onDone={next} />}
          {step === 4 && <StaffStep staff={staff} onDone={next} />}
          {step === 5 && <SubjectsStep existing={subjects} onDone={next} onSkip={next} />}
          {step === 6 && <GradingStep key={sections.join(",")} sections={sections} existing={grading} onDone={next} onSkip={next} />}
          {step === 7 && <FeesStep key={classList.map((c) => c.id).join(",")} classes={classList} items={feeItems} amounts={feeAmounts} onSaved={setFeeSummary} onDone={next} onSkip={next} />}
          {step === 8 && <ReviewStep school={{ ...school, sections }} classes={classList} feeItemsCount={feeSummary.items} feeTotal={feeSummary.total} staff={staff} />}
        </div>

        {/* back control */}
        {step > 0 && (
          <button onClick={back} className="mt-4 text-[13px] font-medium text-ink-4 hover:text-ink">
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
