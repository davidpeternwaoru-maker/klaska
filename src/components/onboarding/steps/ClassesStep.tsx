"use client";

import { useState, useTransition } from "react";
import { Card, Pill } from "@/components/ui/primitives";
import { createClassesBulk } from "@/lib/actions/onboarding";
import { levelsForSections, ARM_LETTERS } from "@/lib/school-setup";
import type { WizardClass } from "../types";
import { StepHead, StepFooter } from "../ui";

type Row = { create: boolean; arms: number };

export function ClassesStep({ sections, existing, onCreated, onDone, ctaLabel }: { sections: string[]; existing: WizardClass[]; onCreated?: (classes: WizardClass[]) => void; onDone: () => void; ctaLabel?: string }) {
  const groups = levelsForSections(sections);
  const existingNames = new Set(existing.map((c) => c.name));
  const [rows, setRows] = useState<Record<string, Row>>(() => {
    const o: Record<string, Row> = {};
    groups.forEach((g) => g.levels.forEach((lv) => (o[lv] = { create: !existingNames.has(lv), arms: 1 })));
    return o;
  });
  const [pending, start] = useTransition();

  const setRow = (lv: string, patch: Partial<Row>) =>
    setRows((r) => ({ ...r, [lv]: { ...(r[lv] ?? { create: true, arms: 1 }), ...patch } }));

  const save = () =>
    start(async () => {
      const items = Object.entries(rows)
        .filter(([, v]) => v.create)
        .map(([name, v]) => ({ name, arms: v.arms <= 1 ? [] : ARM_LETTERS.slice(0, v.arms) }));
      const res = await createClassesBulk(items);
      if (res.classes) onCreated?.(res.classes);
      onDone();
    });

  return (
    <Card>
      <StepHead title="Classes & arms" sub="We've suggested the standard levels for your sections. Tick the ones you run and pick how many arms each has." />
      {groups.length === 0 ? (
        <p className="text-[13px] text-ink-4">Choose your sections in the previous step first.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((g) => (
            <div key={g.section}>
              <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-4">{g.label}</div>
              <div className="flex flex-col divide-y divide-border rounded-[12px] border border-border">
                {g.levels.map((lv) => {
                  const row = rows[lv] ?? { create: !existingNames.has(lv), arms: 1 };
                  const exists = existingNames.has(lv);
                  return (
                    <div key={lv} className="flex items-center gap-3 px-3 py-2.5">
                      <input type="checkbox" checked={row.create} onChange={(e) => setRow(lv, { create: e.target.checked })} />
                      <span className="flex-1 text-[13px] font-medium text-ink">{lv}</span>
                      {exists && <Pill tone="neutral">already added</Pill>}
                      <label className="flex items-center gap-1.5 text-[12px] text-ink-4">
                        Arms
                        <select
                          value={row.arms}
                          onChange={(e) => setRow(lv, { arms: Number(e.target.value) })}
                          disabled={!row.create}
                          className="h-8 rounded-[8px] border border-border bg-secondary px-1.5 text-[12.5px] text-ink outline-none disabled:opacity-50"
                        >
                          <option value={1}>1 (no arm)</option>
                          <option value={2}>2 (A–B)</option>
                          <option value={3}>3 (A–C)</option>
                          <option value={4}>4 (A–D)</option>
                          <option value={5}>5 (A–E)</option>
                          <option value={6}>6 (A–F)</option>
                        </select>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      <StepFooter pending={pending} onSave={save} cta={ctaLabel} />
    </Card>
  );
}
