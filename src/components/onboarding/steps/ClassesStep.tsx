"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { Card, Pill } from "@/components/ui/primitives";
import { createClassesBulk } from "@/lib/actions/onboarding";
import { levelsForSections } from "@/lib/school-setup";
import type { WizardClass } from "../types";
import { StepHead, StepFooter } from "../ui";

type Row = { create: boolean; armsText: string };

// "A, B, Science" -> ["A","B","Science"]; blank -> [] (one class, no arm)
const parseArms = (t: string) => t.split(",").map((s) => s.trim()).filter(Boolean);

export function ClassesStep({
  sections,
  existing,
  onCreated,
  onDone,
  ctaLabel,
}: {
  sections: string[];
  existing: WizardClass[];
  onCreated?: (classes: WizardClass[]) => void;
  onDone: () => void;
  ctaLabel?: string;
}) {
  const groups = levelsForSections(sections);
  const existingNames = new Set(existing.map((c) => c.name));
  const [rows, setRows] = useState<Record<string, Row>>(() => {
    const o: Record<string, Row> = {};
    groups.forEach((g) => g.levels.forEach((lv) => (o[lv] = { create: !existingNames.has(lv), armsText: "" })));
    return o;
  });
  const [pending, start] = useTransition();

  const setRow = (lv: string, patch: Partial<Row>) =>
    setRows((r) => ({ ...r, [lv]: { ...(r[lv] ?? { create: true, armsText: "" }), ...patch } }));

  const save = () =>
    start(async () => {
      const items = Object.entries(rows)
        .filter(([, v]) => v.create)
        .map(([name, v]) => ({ name, arms: parseArms(v.armsText) }));
      const res = await createClassesBulk(items);
      if (res.classes) onCreated?.(res.classes);
      onDone();
    });

  return (
    <Card>
      <StepHead
        title="Classes & arms"
        sub="Tick the levels you run and name their arms — letters like A, B, or department names like Science, Arts, Commercial for SSS. Leave arms blank for a single class."
      />
      {groups.length === 0 ? (
        <p className="text-[13px] text-ink-4">Choose your sections in the previous step first.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((g) => (
            <div key={g.section}>
              <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-4">{g.label}</div>
              <div className="flex flex-col divide-y divide-border rounded-[var(--radius-card)] border border-border">
                {g.levels.map((lv) => {
                  const row = rows[lv] ?? { create: !existingNames.has(lv), armsText: "" };
                  const exists = existingNames.has(lv);
                  const isSenior = lv.startsWith("SSS");
                  return (
                    <div key={lv} className="flex flex-wrap items-center gap-2.5 px-3 py-2.5">
                      <input type="checkbox" checked={row.create} onChange={(e) => setRow(lv, { create: e.target.checked })} />
                      <span className="w-[70px] flex-none text-[13px] font-medium text-ink">{lv}</span>
                      {exists && <Pill tone="neutral">added</Pill>}
                      <input
                        value={row.armsText}
                        onChange={(e) => setRow(lv, { armsText: e.target.value })}
                        disabled={!row.create}
                        placeholder="Arms, comma-separated — blank = single class"
                        className="h-8 min-w-[190px] flex-1 rounded-[8px] border border-border bg-secondary px-2.5 text-[12.5px] text-ink outline-none focus:border-forest-line focus:bg-card disabled:opacity-50"
                      />
                      <div className="flex flex-none gap-1">
                        <Preset onClick={() => setRow(lv, { armsText: "A, B" })} disabled={!row.create}>A–B</Preset>
                        <Preset onClick={() => setRow(lv, { armsText: "A, B, C" })} disabled={!row.create}>A–C</Preset>
                        {isSenior && (
                          <Preset onClick={() => setRow(lv, { armsText: "Science, Arts, Commercial" })} disabled={!row.create}>Departments</Preset>
                        )}
                      </div>
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

function Preset({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-[7px] border border-border px-2 py-1 text-[11px] font-medium text-ink-3 transition hover:bg-secondary disabled:opacity-40"
    >
      {children}
    </button>
  );
}
