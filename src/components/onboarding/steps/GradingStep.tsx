"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { saveGrading } from "@/lib/actions/onboarding";
import { categoriesForSections, GRADING_TEMPLATES, GRADING_CATEGORY_LABEL, type GradingCategory } from "@/lib/school-setup";
import type { WizardBand } from "../types";
import { StepHead, StepFooter, inputCls } from "../ui";

export function GradingStep({ sections, existing, onDone, ctaLabel }: { sections: string[]; existing: Record<string, WizardBand[]>; onDone: () => void; ctaLabel?: string }) {
  const cats = categoriesForSections(sections);
  const catList: GradingCategory[] = cats.length ? cats : ["SECONDARY"];
  const [active, setActive] = useState<GradingCategory>(catList[0]);
  const [byCat, setByCat] = useState<Record<string, WizardBand[]>>(() => {
    const o: Record<string, WizardBand[]> = {};
    catList.forEach((c) => (o[c] = existing[c]?.length ? existing[c].map((b) => ({ ...b })) : GRADING_TEMPLATES[c].map((b) => ({ ...b }))));
    return o;
  });
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const bands = byCat[active];
  const setBands = (next: WizardBand[]) => setByCat((o) => ({ ...o, [active]: next }));
  const upd = (i: number, patch: Partial<WizardBand>) => setBands(bands.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const addRow = () => setBands([...bands, { label: "", minScore: 0, maxScore: 0, remark: "" }]);
  const removeRow = (i: number) => setBands(bands.filter((_, j) => j !== i));
  const reset = () => setBands(GRADING_TEMPLATES[active].map((b) => ({ ...b })));

  const save = () =>
    start(async () => {
      setError(null);
      for (const c of catList) {
        const res = await saveGrading(c, byCat[c]);
        if (!res.ok) {
          setError(res.error ?? "Could not save grading.");
          return;
        }
      }
      onDone();
    });

  return (
    <Card>
      <StepHead title="Grading system" sub="These bands turn scores into grades on report cards. We've filled in the Nigerian recommendations — edit them however your school grades." />

      {catList.length > 1 && (
        <div className="mb-4 inline-flex gap-0.5 rounded-[10px] bg-secondary p-1">
          {catList.map((c) => (
            <button key={c} onClick={() => setActive(c)} className={`h-8 rounded-[7px] px-3 text-[12.5px] font-medium transition ${active === c ? "bg-card text-ink shadow-sm" : "text-ink-3 hover:text-ink"}`}>
              {GRADING_CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-[12px] border border-border">
        <div className="grid grid-cols-[1fr_1fr_1fr_2fr_auto] gap-2 bg-secondary px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-ink-4">
          <span>Grade</span>
          <span>Min %</span>
          <span>Max %</span>
          <span>Remark</span>
          <span />
        </div>
        {bands.map((b, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_2fr_auto] items-center gap-2 border-t border-border px-3 py-2">
            <input className={inputCls} value={b.label} onChange={(e) => upd(i, { label: e.target.value })} placeholder="A1" />
            <input className={inputCls} inputMode="numeric" value={String(b.minScore)} onChange={(e) => upd(i, { minScore: Number(e.target.value) || 0 })} />
            <input className={inputCls} inputMode="numeric" value={String(b.maxScore)} onChange={(e) => upd(i, { maxScore: Number(e.target.value) || 0 })} />
            <input className={inputCls} value={b.remark} onChange={(e) => upd(i, { remark: e.target.value })} placeholder="Excellent" />
            <button onClick={() => removeRow(i)} className="rounded-[7px] p-1.5 text-ink-4 hover:bg-red-soft hover:text-red">
              <Icon name="trash" size={15} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button onClick={addRow} className="flex items-center gap-1.5 text-[12.5px] font-medium text-forest hover:underline">
          <Icon name="plus" size={14} /> Add band
        </button>
        <button onClick={reset} className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-4 hover:text-ink">
          <Icon name="refresh" size={14} /> Reset to recommended
        </button>
      </div>

      {error && <p className="mt-3 text-[12.5px] font-medium text-red">{error}</p>}
      <StepFooter pending={pending} onSave={save} cta={ctaLabel} />
    </Card>
  );
}
