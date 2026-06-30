"use client";

// Client UI for staff. Adding a staff member also sets their initial login
// password, so they can sign in immediately. Only owners/bursars see this work
// (the server action enforces it regardless of the UI).

import { useActionState, useEffect, useRef } from "react";
import { Card, Pill } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { createStaff, deleteStaff, type ActionState } from "@/lib/actions/staff";

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "BURSAR" | "TEACHER";
  title: string | null;
  phone: string | null;
  isSelf: boolean;
};

const input =
  "h-9 w-full rounded-[9px] border border-border bg-secondary px-2.5 text-[13px] text-ink outline-none focus:border-forest-line focus:bg-card";

const roleTone: Record<StaffRow["role"], "forest" | "amber" | "neutral"> = { OWNER: "forest", BURSAR: "amber", TEACHER: "neutral" };

function AddForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createStaff, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok, state]);

  return (
    <Card>
      <div className="mb-3 text-[14px] font-semibold text-ink">Add staff</div>
      <form ref={ref} action={action} className="flex flex-col gap-3">
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Full name *</span>
          <input name="name" required className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Email (their login) *</span>
          <input name="email" type="email" required className={input} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Role</span>
            <select name="role" defaultValue="TEACHER" className={input}>
              <option value="TEACHER">Teacher</option>
              <option value="BURSAR">Bursar</option>
              <option value="OWNER">Owner</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Job title</span>
            <input name="title" placeholder="e.g. Maths Teacher" className={input} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Phone</span>
            <input name="phone" className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Initial password *</span>
            <input name="password" type="text" required placeholder="min. 6 chars" className={input} />
          </label>
        </div>
        {state.error && <p className="text-[12.5px] font-medium text-red">{state.error}</p>}
        {state.ok && <p className="text-[12.5px] font-medium text-green">Staff added.</p>}
        <div>
          <button disabled={pending} className="h-9 rounded-[9px] bg-forest px-4 text-[13px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60">
            {pending ? "Saving…" : "Add staff"}
          </button>
        </div>
      </form>
    </Card>
  );
}

export function StaffManager({ staff }: { staff: StaffRow[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
      <Card pad={0} className="overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <div className="text-[14px] font-semibold text-ink">Staff</div>
          <Pill tone="neutral">{staff.length}</Pill>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-y border-border text-[11px] uppercase tracking-[0.05em] text-ink-4">
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Email</th>
                <th className="px-4 py-2 text-left font-medium">Role</th>
                <th className="px-4 py-2 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-ink">{s.name}</div>
                    {s.title && <div className="text-[11.5px] text-ink-4">{s.title}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-ink-3">{s.email}</td>
                  <td className="px-4 py-2.5">
                    <Pill tone={roleTone[s.role]}>{s.role.toLowerCase()}</Pill>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {s.isSelf ? (
                      <span className="text-[11.5px] text-ink-4">you</span>
                    ) : (
                      <form action={deleteStaff} className="inline">
                        <input type="hidden" name="id" value={s.id} />
                        <button title="Remove" className="rounded-[7px] p-1.5 text-ink-3 hover:bg-red-soft hover:text-red">
                          <Icon name="trash" size={15} />
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AddForm />
    </div>
  );
}
