"use client";

// Fee collection preferences — manual now; virtual (bank/virtual-account)
// tracking is planned, so the switch exists but is clearly marked coming soon.

import { useState, useTransition } from "react";
import { Card, Pill } from "@/components/ui/primitives";
import { saveFeePrefs } from "@/lib/actions/notifications";

export function FeePrefs({ initial }: { initial: { feeCollection: string; autoFeeReminders: boolean } }) {
  const [mode, setMode] = useState(initial.feeCollection);
  const [auto, setAuto] = useState(initial.autoFeeReminders);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const save = () =>
    start(async () => {
      const res = await saveFeePrefs({ feeCollection: mode, autoFeeReminders: auto });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });

  return (
    <Card className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-body font-semibold text-ink">Fee collection</div>
          <div className="mt-0.5 text-[12.5px] text-ink-4">How your school records fee payments.</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode("MANUAL")}
            className={`h-9 rounded-[9px] px-3.5 text-[12.5px] font-semibold transition ${mode === "MANUAL" ? "bg-forest text-white" : "border border-border text-ink-2 hover:bg-secondary"}`}
          >
            Manual entry
          </button>
          <button
            onClick={() => setMode("VIRTUAL")}
            className={`flex h-9 items-center gap-1.5 rounded-[9px] px-3.5 text-[12.5px] font-semibold transition ${mode === "VIRTUAL" ? "bg-forest text-white" : "border border-border text-ink-2 hover:bg-secondary"}`}
          >
            Virtual tracking <Pill tone="amber">soon</Pill>
          </button>
        </div>
      </div>
      <label className="mt-3 flex items-center gap-2 text-[12.5px] text-ink-2">
        <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
        Send automatic fee reminders to parents (uses your Notifications settings)
      </label>
      <div className="mt-3 flex items-center justify-end gap-3">
        {saved && <span className="text-[12.5px] font-medium text-green">Saved ✓</span>}
        <button onClick={save} disabled={pending} className="h-9 rounded-[9px] bg-forest px-4 text-[13px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60">
          {pending ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </Card>
  );
}
