"use client";

// The early "win" (PM recommendation): let the proprietor import their real
// students right after classes exist. Seeing actual students populate the
// dashboard is the moment onboarding becomes worth finishing.

import { Card } from "@/components/ui/primitives";
import { ImportStudents } from "@/components/dashboard/ImportStudents";
import { StepHead } from "../ui";
import type { WizardClass } from "../types";

export function StudentsStep({ classes, onDone }: { classes: WizardClass[]; onDone: () => void }) {
  const labels = classes.flatMap((c) => [c.arm ? `${c.name} ${c.arm}` : c.name, c.name]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <StepHead
          title="Bring in your students"
          sub="Upload your student list now — it takes 30 seconds and your dashboard comes alive. Broken rows are kept aside for fixing, never rejected. You can also do this later."
        />
      </Card>
      <ImportStudents existingClasses={labels} />
      <div className="flex items-center justify-between">
        <button onClick={onDone} className="text-[13px] font-medium text-ink-4 transition hover:text-ink">
          Skip for now →
        </button>
        <button onClick={onDone} className="h-10 rounded-[10px] bg-forest px-5 text-[13.5px] font-semibold text-white transition hover:bg-forest-2">
          Continue
        </button>
      </div>
    </div>
  );
}
