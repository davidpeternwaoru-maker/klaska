"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Card, Pill } from "@/components/ui/primitives";
import { createStaff, type ActionState } from "@/lib/actions/staff";
import type { WizardStaff } from "../types";
import { StepHead, Field, inputCls } from "../ui";

export function StaffStep({ staff, onDone, ctaLabel = "Continue" }: { staff: WizardStaff[]; onDone: () => void; ctaLabel?: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createStaff, {});
  const ref = useRef<HTMLFormElement>(null);
  const [addedCount, setAddedCount] = useState(0);
  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setAddedCount((n) => n + 1);
    }
  }, [state.ok, state]);

  return (
    <Card>
      <StepHead title="Staff & access" sub="Add the people who'll use Klaska and set what they can do. You (the owner) are already set up — add bursars and teachers here or later." />

      <div className="mb-4 flex flex-wrap gap-2">
        {staff.map((s) => (
          <Pill key={s.id} tone={s.role === "OWNER" ? "forest" : s.role === "BURSAR" ? "amber" : "neutral"}>
            {s.name} · {s.role.toLowerCase()}
          </Pill>
        ))}
        {addedCount > 0 && <Pill tone="green">+{addedCount} added</Pill>}
      </div>

      <form ref={ref} action={action} className="grid grid-cols-2 gap-3 rounded-[12px] border border-border p-3">
        <Field label="Full name *"><input name="name" required className={inputCls} /></Field>
        <Field label="Email (their login) *"><input name="email" type="email" required className={inputCls} /></Field>
        <Field label="Role">
          <select name="role" defaultValue="TEACHER" className={inputCls}>
            <option value="TEACHER">Teacher</option>
              <option value="HOS">Principal (HOS)</option>
              <option value="BURSAR">Bursar</option>
              <option value="HOD">Head of Department</option>
              <option value="ADMIN">Admin Officer</option>
              <option value="OWNER">Owner</option>
          </select>
        </Field>
        <Field label="Job title"><input name="title" placeholder="e.g. Maths Teacher" className={inputCls} /></Field>
        <Field label="Phone"><input name="phone" className={inputCls} /></Field>
        <Field label="Initial password *"><input name="password" type="text" required placeholder="min. 6 chars" className={inputCls} /></Field>
        <div className="col-span-2 flex items-center justify-between">
          {state.error ? <span className="text-[12.5px] font-medium text-red">{state.error}</span> : <span className="text-[12px] text-ink-4">They can sign in immediately with this password.</span>}
          <button disabled={pending} className="h-9 rounded-[9px] border border-border px-4 text-[13px] font-medium text-ink-2 transition hover:bg-secondary disabled:opacity-60">
            {pending ? "Adding…" : "Add staff"}
          </button>
        </div>
      </form>

      <div className="mt-5 flex items-center justify-end">
        <button onClick={onDone} className="h-10 rounded-[10px] bg-forest px-5 text-[13.5px] font-semibold text-white transition hover:bg-forest-2">
          {ctaLabel}
        </button>
      </div>
    </Card>
  );
}
