"use client";

// Shared building blocks for the login & signup forms. Keeping the field markup
// in one place means both forms look identical and we style inputs once.

import type { ReactNode } from "react";

export const inputClass =
  "h-10 w-full rounded-[10px] border border-border bg-secondary px-3 text-[13.5px] text-ink outline-none transition placeholder:text-ink-4 focus:border-forest-line focus:bg-card";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-ink-2">{label}</span>
      {children}
    </label>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 w-full rounded-[10px] bg-forest text-[13.5px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60"
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="rounded-[8px] bg-red-soft px-3 py-2 text-[12.5px] font-medium text-red">{message}</p>;
}
