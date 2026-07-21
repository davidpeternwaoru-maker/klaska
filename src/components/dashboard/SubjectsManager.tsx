"use client";

import { useActionState, useEffect, useRef } from "react";
import { Card, Pill } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { createSubject, deleteSubject, type ActionState } from "@/lib/actions/results";

export type SubjectRow = { id: string; name: string; code: string | null };

const input =
  "h-9 w-full rounded-[9px] border border-border bg-secondary px-2.5 text-[13px] text-ink outline-none focus:border-forest-line focus:bg-card";

function AddForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createSubject, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok, state]);

  return (
    <Card>
      <div className="mb-3 text-body font-semibold text-ink">Add a subject</div>
      <form ref={ref} action={action} className="flex flex-col gap-3">
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Subject name *</span>
          <input name="name" required placeholder="e.g. Mathematics" className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Code</span>
          <input name="code" placeholder="e.g. MTH" className={input} />
        </label>
        {state.error && <p className="text-[12.5px] font-medium text-red">{state.error}</p>}
        {state.ok && <p className="text-[12.5px] font-medium text-green">Added.</p>}
        <div>
          <button disabled={pending} className="h-9 rounded-[9px] bg-forest px-4 text-[13px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60">
            {pending ? "Saving…" : "Add subject"}
          </button>
        </div>
      </form>
    </Card>
  );
}

export function SubjectsManager({ subjects }: { subjects: SubjectRow[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
      <Card pad={0} className="overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <div className="text-body font-semibold text-ink">Subjects</div>
          <Pill tone="neutral">{subjects.length}</Pill>
        </div>
        {subjects.length === 0 ? (
          <div className="px-4 pb-8 pt-2 text-center text-[13px] text-ink-4">No subjects yet. Add your first one →</div>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <tbody>
              {subjects.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                  <td className="px-4 py-2.5 font-medium text-ink">{s.name}</td>
                  <td className="px-4 py-2.5 text-ink-4">{s.code ?? ""}</td>
                  <td className="px-4 py-2.5 text-right">
                    <form action={deleteSubject} className="inline">
                      <input type="hidden" name="id" value={s.id} />
                      <button title="Delete" className="rounded-[7px] p-1.5 text-ink-3 hover:bg-red-soft hover:text-red">
                        <Icon name="trash" size={15} />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <AddForm />
    </div>
  );
}
