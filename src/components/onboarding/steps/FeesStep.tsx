"use client";

import { useState, useTransition } from "react";
import { Card, Pill } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { saveFeeStructure } from "@/lib/actions/onboarding";
import { SUGGESTED_FEES } from "@/lib/school-setup";
import type { WizardClass, WizardFeeItem, WizardFeeAmounts } from "../types";
import { StepHead } from "../ui";

type FeeType = { id: string; name: string; mandatory: boolean };

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export function FeesStep({
  classes,
  items,
  amounts,
  onDone,
  onSaved,
  ctaLabel,
  onSkip,
}: {
  classes: WizardClass[];
  items: WizardFeeItem[];
  amounts: WizardFeeAmounts;
  onDone: () => void;
  onSaved?: (summary: { items: number; total: number }) => void;
  ctaLabel?: string;
  onSkip?: () => void;
}) {
  const classLabel = (c: WizardClass) => (c.arm ? `${c.name} ${c.arm}` : c.name);

  const [types, setTypes] = useState<FeeType[]>(() =>
    (items.length ? items : SUGGESTED_FEES.map((f) => ({ name: f.name, mandatory: f.mandatory }))).map((f) => ({ id: uid(), name: f.name, mandatory: f.mandatory })),
  );
  // grid[classId][typeId] = amount as string
  const [grid, setGrid] = useState<Record<string, Record<string, string>>>(() => {
    const g: Record<string, Record<string, string>> = {};
    for (const c of classes) {
      g[c.id] = {};
      for (const t of types) {
        const v = amounts[t.name]?.[c.id];
        g[c.id][t.id] = v ? String(v) : "";
      }
    }
    return g;
  });
  const [pending, start] = useTransition();

  const setType = (id: string, patch: Partial<FeeType>) => setTypes((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const addType = () => setTypes((ts) => [...ts, { id: uid(), name: "", mandatory: true }]);
  const removeType = (id: string) => setTypes((ts) => ts.filter((t) => t.id !== id));
  const setCell = (classId: string, typeId: string, v: string) => setGrid((g) => ({ ...g, [classId]: { ...(g[classId] ?? {}), [typeId]: v } }));

  const copyFirstToAll = () => {
    if (!classes.length) return;
    const first = grid[classes[0].id] ?? {};
    setGrid((g) => {
      const next = { ...g };
      for (const c of classes) next[c.id] = { ...first };
      return next;
    });
  };

  const rowTotal = (classId: string) => types.reduce((s, t) => s + (Number(grid[classId]?.[t.id]) || 0), 0);
  const grandTotal = classes.reduce((s, c) => s + rowTotal(c.id), 0);

  const save = () =>
    start(async () => {
      const clean = types.filter((t) => t.name.trim());
      const feeItems = clean.map((t) => ({ name: t.name.trim(), mandatory: t.mandatory }));
      const cells: { itemName: string; classId: string; amount: number }[] = [];
      for (const c of classes) {
        for (const t of clean) {
          const v = Number(grid[c.id]?.[t.id]) || 0;
          if (v > 0) cells.push({ itemName: t.name.trim(), classId: c.id, amount: v });
        }
      }
      await saveFeeStructure(feeItems, cells);
      onSaved?.({ items: feeItems.length, total: cells.reduce((s, x) => s + x.amount, 0) });
      onDone();
    });

  return (
    <Card>
      <StepHead title="Fee structure" sub="Set the fee for each class. Amounts vary by class — for SSS departments, name your SSS arms “Science / Arts / Commercial” in the Classes step and each gets its own row here." />

      {classes.length === 0 ? (
        <p className="text-[13px] text-ink-4">Add your classes in the previous step first, then set their fees here.</p>
      ) : (
        <>
          {/* fee types */}
          <div className="mb-4">
            <div className="mb-2 text-[12px] font-medium text-ink-3">Fee types</div>
            <div className="flex flex-wrap gap-2">
              {types.map((t) => (
                <div key={t.id} className="flex items-center gap-1.5 rounded-[10px] border border-border bg-secondary/50 py-1 pl-2 pr-1">
                  <input
                    value={t.name}
                    onChange={(e) => setType(t.id, { name: e.target.value })}
                    placeholder="Fee name"
                    className="h-7 w-28 rounded-[7px] border border-transparent bg-transparent px-1.5 text-[12.5px] text-ink outline-none focus:border-forest-line focus:bg-card"
                  />
                  <label className="flex items-center gap-1 text-[11px] text-ink-4" title="Required for every student in the class">
                    <input type="checkbox" checked={t.mandatory} onChange={(e) => setType(t.id, { mandatory: e.target.checked })} /> req
                  </label>
                  <button onClick={() => removeType(t.id)} className="rounded-[6px] p-1 text-ink-4 hover:bg-red-soft hover:text-red">
                    <Icon name="x" size={13} />
                  </button>
                </div>
              ))}
              <button onClick={addType} className="flex items-center gap-1 rounded-[10px] border border-dashed border-border px-2.5 py-1.5 text-[12.5px] font-medium text-forest hover:bg-secondary">
                <Icon name="plus" size={13} /> Add fee type
              </button>
            </div>
          </div>

          {/* grid */}
          <div className="overflow-x-auto rounded-[12px] border border-border">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="bg-secondary text-[11px] uppercase tracking-wide text-ink-4">
                  <th className="sticky left-0 z-10 bg-secondary px-3 py-2 text-left font-medium">Class</th>
                  {types.map((t) => (
                    <th key={t.id} className="px-2 py-2 text-right font-medium">{t.name || "—"}</th>
                  ))}
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="sticky left-0 z-10 bg-card px-3 py-1.5 font-medium text-ink">{classLabel(c)}</td>
                    {types.map((t) => (
                      <td key={t.id} className="px-2 py-1.5 text-right">
                        <input
                          inputMode="numeric"
                          value={grid[c.id]?.[t.id] ?? ""}
                          onChange={(e) => setCell(c.id, t.id, e.target.value)}
                          placeholder="0"
                          className="h-8 w-24 rounded-[7px] border border-border bg-secondary px-2 text-right text-[12.5px] text-ink outline-none focus:border-forest-line focus:bg-card"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-right font-semibold text-ink">₦{rowTotal(c.id).toLocaleString("en-NG")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <button onClick={copyFirstToAll} className="flex items-center gap-1.5 text-[12.5px] font-medium text-forest hover:underline">
              <Icon name="refresh" size={14} /> Copy the first class&apos;s fees to all
            </button>
            <span className="text-[12.5px] text-ink-4">
              All classes combined: <b className="text-ink">₦{grandTotal.toLocaleString("en-NG")}</b> <Pill tone="neutral">{types.length} fee types</Pill>
            </span>
          </div>
        </>
      )}

      <div className="mt-5 flex items-center justify-end gap-3">
        {onSkip && (
          <button onClick={onSkip} className="text-[13px] font-medium text-ink-4 transition hover:text-ink">Skip for now →</button>
        )}
        <button onClick={save} disabled={pending} className="h-10 rounded-[10px] bg-forest px-5 text-[13.5px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60">
          {pending ? "Saving…" : ctaLabel ?? "Save & continue"}
        </button>
      </div>
    </Card>
  );
}
