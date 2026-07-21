"use client";

import type { ReactNode } from "react";

export const inputCls =
  "h-10 w-full rounded-[var(--radius-card)] border border-border bg-secondary px-3 text-[13.5px] text-ink outline-none focus:border-forest-line focus:bg-card placeholder:text-ink-4";

export function StepHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <div className="text-[15px] font-semibold text-ink">{title}</div>
      {sub && <div className="mt-0.5 text-[12.5px] text-ink-4">{sub}</div>}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-medium text-ink-3">{label}</span>
      {children}
    </label>
  );
}

export function StepFooter({
  pending,
  onSave,
  cta = "Save & continue",
  extra,
  onSkip,
}: {
  pending: boolean;
  onSave: () => void;
  cta?: string;
  extra?: ReactNode;
  onSkip?: () => void; // PM: never let a hard step stall onboarding
}) {
  return (
    <div className="mt-5 flex items-center justify-between gap-3">
      {extra ?? <span />}
      <span className="flex items-center gap-3">
        {onSkip && (
          <button onClick={onSkip} className="text-[13px] font-medium text-ink-4 transition hover:text-ink">
            Skip for now →
          </button>
        )}
        <button
          onClick={onSave}
          disabled={pending}
          className="h-10 rounded-[var(--radius-card)] bg-forest px-5 text-[13.5px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60"
        >
          {pending ? "Saving…" : cta}
        </button>
      </span>
    </div>
  );
}
