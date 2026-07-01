"use client";

import { useState, useTransition } from "react";
import { Card, Pill } from "@/components/ui/primitives";
import { completeSetup } from "@/lib/actions/onboarding";
import { SECTIONS } from "@/lib/school-setup";
import type { WizardSchool, WizardClass, WizardFee, WizardStaff } from "../types";
import { StepHead } from "../ui";

export function ReviewStep({ school, classes, fees, staff }: { school: WizardSchool; classes: WizardClass[]; fees: WizardFee[]; staff: WizardStaff[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const sectionLabels = SECTIONS.filter((s) => school.sections.includes(s.key)).map((s) => s.label);
  const feeTotal = fees.reduce((t, f) => t + (f.amount || 0), 0);

  const finish = () =>
    start(async () => {
      setError(null);
      try {
        await completeSetup(); // redirects to /dashboard
      } catch (e) {
        // redirect() throws NEXT_REDIRECT on success — only real errors reach here.
        if (e instanceof Error && !/NEXT_REDIRECT/.test(e.message)) setError("Could not finish setup. Please try again.");
      }
    });

  const Row = ({ k, v }: { k: string; v: string }) => (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <span className="text-[12.5px] text-ink-4">{k}</span>
      <span className="text-[13px] font-medium text-ink">{v}</span>
    </div>
  );

  return (
    <Card>
      <StepHead title="Review & finish" sub="Here's your setup. You can change any of this later in Settings." />

      <div className="flex items-center gap-3 rounded-[12px] bg-secondary p-3">
        {school.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={school.logoUrl} alt="logo" className="h-12 w-12 rounded-[10px] object-contain" />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-forest font-display text-[15px] font-bold text-white">{(school.shortName || school.name).slice(0, 2).toUpperCase()}</span>
        )}
        <div>
          <div className="text-[14px] font-semibold text-ink">{school.name}</div>
          {school.motto && <div className="text-[12px] italic text-ink-4">“{school.motto}”</div>}
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 text-[12px] font-medium text-ink-3">Sections</div>
        <div className="flex flex-wrap gap-1.5">
          {sectionLabels.length ? sectionLabels.map((l) => <Pill key={l} tone="forest">{l}</Pill>) : <span className="text-[12.5px] text-ink-4">None selected</span>}
        </div>
      </div>

      <div className="mt-3">
        <Row k="Classes created" v={String(classes.length)} />
        <Row k="Fee items" v={`${fees.length} · ₦${feeTotal.toLocaleString("en-NG")}/term`} />
        <Row k="Staff" v={String(staff.length)} />
        <Row k="Contact" v={school.email || school.phone || "—"} />
      </div>

      {error && <p className="mt-3 text-[12.5px] font-medium text-red">{error}</p>}

      <div className="mt-5 flex items-center justify-end">
        <button onClick={finish} disabled={pending} className="h-11 rounded-[10px] bg-forest px-6 text-[14px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60">
          {pending ? "Finishing…" : "Finish & enter Klaska →"}
        </button>
      </div>
    </Card>
  );
}
