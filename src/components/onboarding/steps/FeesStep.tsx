"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { saveFees } from "@/lib/actions/onboarding";
import { SECTIONS, SUGGESTED_FEES } from "@/lib/school-setup";
import type { WizardFee } from "../types";
import { StepHead, StepFooter, inputCls } from "../ui";

export function FeesStep({ sections, existing, onDone, ctaLabel }: { sections: string[]; existing: WizardFee[]; onDone: () => void; ctaLabel?: string }) {
  const applyOptions = [{ value: "ALL", label: "All students" }, ...SECTIONS.filter((s) => sections.includes(s.key)).map((s) => ({ value: s.key, label: s.label }))];

  const [rows, setRows] = useState<WizardFee[]>(() =>
    existing.length ? existing.map((f) => ({ ...f })) : SUGGESTED_FEES.map((f) => ({ name: f.name, amount: 0, appliesTo: "ALL", mandatory: f.mandatory })),
  );
  const [pending, start] = useTransition();

  const upd = (i: number, patch: Partial<WizardFee>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, { name: "", amount: 0, appliesTo: "ALL", mandatory: true }]);
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, j) => j !== i));

  const total = rows.reduce((t, r) => t + (Number(r.amount) || 0), 0);

  const save = () =>
    start(async () => {
      await saveFees(rows.map((r) => ({ name: r.name, amount: Number(r.amount) || 0, appliesTo: r.appliesTo ?? "ALL", mandatory: r.mandatory })));
      onDone();
    });

  return (
    <Card>
      <StepHead title="Fee structure" sub="List the charges for a term. This is the groundwork for the Fees module (invoices & payments) — you can refine amounts anytime." />

      <div className="overflow-hidden rounded-[12px] border border-border">
        <div className="grid grid-cols-[2fr_1.2fr_1.4fr_auto_auto] gap-2 bg-secondary px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-ink-4">
          <span>Fee item</span>
          <span>Amount (₦)</span>
          <span>Applies to</span>
          <span>Required</span>
          <span />
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[2fr_1.2fr_1.4fr_auto_auto] items-center gap-2 border-t border-border px-3 py-2">
            <input className={inputCls} value={r.name} onChange={(e) => upd(i, { name: e.target.value })} placeholder="e.g. Tuition" />
            <input className={inputCls} inputMode="numeric" value={r.amount ? String(r.amount) : ""} onChange={(e) => upd(i, { amount: Number(e.target.value) || 0 })} placeholder="0" />
            <select className={inputCls} value={r.appliesTo ?? "ALL"} onChange={(e) => upd(i, { appliesTo: e.target.value })}>
              {applyOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <input type="checkbox" checked={r.mandatory} onChange={(e) => upd(i, { mandatory: e.target.checked })} className="mx-auto" />
            <button onClick={() => removeRow(i)} className="rounded-[7px] p-1.5 text-ink-4 hover:bg-red-soft hover:text-red">
              <Icon name="trash" size={15} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button onClick={addRow} className="flex items-center gap-1.5 text-[12.5px] font-medium text-forest hover:underline">
          <Icon name="plus" size={14} /> Add fee item
        </button>
        <span className="text-[12.5px] text-ink-4">Total per term: <b className="text-ink">₦{total.toLocaleString("en-NG")}</b></span>
      </div>

      <StepFooter pending={pending} onSave={save} cta={ctaLabel} />
    </Card>
  );
}
