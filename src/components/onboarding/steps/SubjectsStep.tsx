"use client";

// Subjects step (Flow 1) — tick the common Nigerian subjects your school
// teaches and add any others. Scores are entered against these later.

import { useState, useTransition } from "react";
import { Card, Pill } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { createSubjectsBulk } from "@/lib/actions/results";
import { StepHead, StepFooter } from "../ui";

const COMMON: { group: string; subjects: string[] }[] = [
  { group: "Core", subjects: ["English Language", "Mathematics", "Civic Education", "Computer Studies"] },
  { group: "Sciences", subjects: ["Basic Science", "Physics", "Chemistry", "Biology", "Agricultural Science", "Further Mathematics"] },
  { group: "Arts & Humanities", subjects: ["Literature in English", "Government", "History", "Christian Religious Studies", "Islamic Religious Studies", "Fine Arts"] },
  { group: "Commercial & Social", subjects: ["Economics", "Commerce", "Financial Accounting", "Business Studies", "Social Studies", "Geography"] },
  { group: "Languages & Others", subjects: ["Yoruba", "Igbo", "Hausa", "French", "Home Economics", "Physical & Health Education"] },
];

export function SubjectsStep({ existing, onDone, ctaLabel }: { existing: string[]; onDone: () => void; ctaLabel?: string }) {
  const have = new Set(existing.map((s) => s.toLowerCase()));
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(COMMON.flatMap((g) => g.subjects).filter((s) => have.has(s.toLowerCase()))),
  );
  const [custom, setCustom] = useState("");
  const [customs, setCustoms] = useState<string[]>([]);
  const [pending, start] = useTransition();

  const toggle = (s: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(s)) n.delete(s);
      else n.add(s);
      return n;
    });

  const addCustom = () => {
    const v = custom.trim();
    if (v && !customs.includes(v)) setCustoms((c) => [...c, v]);
    setCustom("");
  };

  const total = picked.size + customs.length;

  const save = () =>
    start(async () => {
      await createSubjectsBulk([...picked, ...customs]);
      onDone();
    });

  return (
    <Card>
      <StepHead title="Subjects" sub="Tick what your school teaches — scores and report cards are entered against these. Add anything we missed." />
      <div className="flex flex-col gap-4">
        {COMMON.map((g) => (
          <div key={g.group}>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-4">{g.group}</div>
            <div className="flex flex-wrap gap-1.5">
              {g.subjects.map((s) => {
                const on = picked.has(s) || have.has(s.toLowerCase());
                return (
                  <button
                    key={s}
                    onClick={() => toggle(s)}
                    className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium transition ${on ? "bg-forest text-white" : "bg-secondary text-ink-2 hover:bg-border"}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
            placeholder="Add another subject…"
            className="h-9 w-56 rounded-[9px] border border-border bg-secondary px-2.5 text-[13px] text-ink outline-none focus:border-forest-line focus:bg-card"
          />
          <button onClick={addCustom} className="flex items-center gap-1 rounded-[9px] border border-border px-3 py-2 text-[12.5px] font-medium text-forest hover:bg-secondary">
            <Icon name="plus" size={14} /> Add
          </button>
          {customs.map((c) => (
            <Pill key={c} tone="forest">{c}</Pill>
          ))}
          <span className="ml-auto text-[12.5px] text-ink-4">{total} selected</span>
        </div>
      </div>
      <StepFooter pending={pending} onSave={save} cta={ctaLabel} />
    </Card>
  );
}
