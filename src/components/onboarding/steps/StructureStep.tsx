"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { saveSections } from "@/lib/actions/onboarding";
import { SECTIONS } from "@/lib/school-setup";
import { StepHead, StepFooter } from "../ui";

export function StructureStep({ sections, onSaved, onDone, ctaLabel }: { sections: string[]; onSaved?: (s: string[]) => void; onDone: () => void; ctaLabel?: string }) {
  const [picked, setPicked] = useState<string[]>(sections);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = (key: string) => setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

  const save = () =>
    start(async () => {
      setError(null);
      const res = await saveSections(picked);
      if (res.ok) {
        onSaved?.(picked); // hand the fresh sections to the wizard immediately
        onDone();
      } else setError(res.error ?? "Could not save.");
    });

  return (
    <Card>
      <StepHead title="What does your school run?" sub="Pick only the sections you operate. You'll only ever see levels for these — a secondary-only school won't see primary, and so on." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SECTIONS.map((s) => {
          const on = picked.includes(s.key);
          return (
            <button
              key={s.key}
              onClick={() => toggle(s.key)}
              className={`flex items-center gap-3 rounded-[var(--radius-card)] border p-4 text-left transition ${on ? "border-forest bg-forest-soft" : "border-border hover:bg-secondary"}`}
            >
              <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-md border ${on ? "border-forest bg-forest text-white" : "border-border bg-card"}`}>
                {on && <Icon name="check" size={14} />}
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold text-ink">{s.label}</span>
                <span className="block text-[12px] text-ink-4">{s.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-3 text-[12.5px] font-medium text-red">{error}</p>}
      <StepFooter pending={pending} onSave={save} cta={ctaLabel} />
    </Card>
  );
}
