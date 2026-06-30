"use client";

// Client UI for classes. A class = name (level) + optional arm + optional form
// teacher. The teacher dropdown is the school's staff list passed from the server.

import { useActionState, useEffect, useRef } from "react";
import { Card, Pill } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { createClass, deleteClass, type ActionState } from "@/lib/actions/classes";

export type ClassRow = {
  id: string;
  name: string;
  arm: string | null;
  teacherName: string | null;
  studentCount: number;
};
export type TeacherOption = { id: string; name: string };

const input =
  "h-9 w-full rounded-[9px] border border-border bg-secondary px-2.5 text-[13px] text-ink outline-none focus:border-forest-line focus:bg-card";

function AddForm({ teachers }: { teachers: TeacherOption[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createClass, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok, state]);

  return (
    <Card>
      <div className="mb-3 text-[14px] font-semibold text-ink">Add a class</div>
      <form ref={ref} action={action} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Class / level *</span>
            <input name="name" required placeholder="e.g. JSS 1" className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Arm</span>
            <input name="arm" placeholder="e.g. A" className={input} />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Form teacher</span>
          <select name="teacherId" defaultValue="" className={input}>
            <option value="">Unassigned</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        {state.error && <p className="text-[12.5px] font-medium text-red">{state.error}</p>}
        {state.ok && <p className="text-[12.5px] font-medium text-green">Class created.</p>}
        <div>
          <button disabled={pending} className="h-9 rounded-[9px] bg-forest px-4 text-[13px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60">
            {pending ? "Saving…" : "Add class"}
          </button>
        </div>
      </form>
    </Card>
  );
}

export function ClassesManager({ classes, teachers }: { classes: ClassRow[]; teachers: TeacherOption[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
      <Card pad={0} className="overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <div className="text-[14px] font-semibold text-ink">Classes</div>
          <Pill tone="neutral">{classes.length}</Pill>
        </div>
        {classes.length === 0 ? (
          <div className="px-4 pb-8 pt-2 text-center text-[13px] text-ink-4">No classes yet. Create your first one →</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-y border-border text-[11px] uppercase tracking-[0.05em] text-ink-4">
                  <th className="px-4 py-2 text-left font-medium">Class</th>
                  <th className="px-4 py-2 text-left font-medium">Form teacher</th>
                  <th className="px-4 py-2 text-left font-medium">Students</th>
                  <th className="px-4 py-2 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                    <td className="px-4 py-2.5 font-medium text-ink">{c.arm ? `${c.name} ${c.arm}` : c.name}</td>
                    <td className="px-4 py-2.5 text-ink-3">{c.teacherName ?? <span className="text-ink-4">Unassigned</span>}</td>
                    <td className="px-4 py-2.5">{c.studentCount}</td>
                    <td className="px-4 py-2.5 text-right">
                      <form action={deleteClass} className="inline">
                        <input type="hidden" name="id" value={c.id} />
                        <button title="Delete" className="rounded-[7px] p-1.5 text-ink-3 hover:bg-red-soft hover:text-red">
                          <Icon name="trash" size={15} />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AddForm teachers={teachers} />
    </div>
  );
}
