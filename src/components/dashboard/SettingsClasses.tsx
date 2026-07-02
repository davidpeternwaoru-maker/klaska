"use client";

// Classes & arms editor for Settings. Schools with several arms of the same
// level name them freely — "JSS 1 Emerald", "JSS 1 Sapphire" — and can rename
// or remove any class here. Amounts in the fee grid follow the class.

import { useActionState, useEffect, useRef, useState } from "react";
import { Card, Pill } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { createClass, updateClass, deleteClass, type ActionState } from "@/lib/actions/classes";

export type SettingsClassRow = { id: string; name: string; arm: string | null; studentCount: number };

const input =
  "h-9 rounded-[9px] border border-border bg-secondary px-2.5 text-[13px] text-ink outline-none focus:border-forest-line focus:bg-card";

function EditRow({ c, onClose }: { c: SettingsClassRow; onClose: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateClass, {});
  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, state, onClose]);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={c.id} />
      <input name="name" defaultValue={c.name} className={`${input} w-28`} placeholder="Level (JSS 1)" />
      <input name="arm" defaultValue={c.arm ?? ""} className={`${input} w-32`} placeholder="Arm (Emerald)" />
      <button disabled={pending} className="h-9 rounded-[9px] bg-forest px-3 text-[12.5px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60">
        {pending ? "Saving…" : "Save"}
      </button>
      <button type="button" onClick={onClose} className="h-9 rounded-[9px] border border-border px-3 text-[12.5px] font-medium text-ink-2 hover:bg-secondary">
        Cancel
      </button>
      {state.error && <span className="text-[12px] font-medium text-red">{state.error}</span>}
    </form>
  );
}

function AddRow() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createClass, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok, state]);
  return (
    <form ref={ref} action={action} className="flex flex-wrap items-center gap-2 border-t border-border bg-secondary/40 px-4 py-3">
      <span className="text-[12px] font-medium text-ink-3">Add class:</span>
      <input name="name" required className={`${input} w-28`} placeholder="Level (JSS 1)" />
      <input name="arm" className={`${input} w-32`} placeholder="Arm (Emerald)" />
      <button disabled={pending} className="h-9 rounded-[9px] bg-forest px-3.5 text-[12.5px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60">
        {pending ? "Adding…" : "Add"}
      </button>
      {state.error && <span className="text-[12px] font-medium text-red">{state.error}</span>}
      {state.ok && <span className="text-[12px] font-medium text-green">Added.</span>}
    </form>
  );
}

export function SettingsClasses({ classes }: { classes: SettingsClassRow[] }) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <Card pad={0} className="overflow-hidden">
      <div className="p-5 pb-3">
        <div className="text-[15px] font-semibold text-ink">Classes & arms</div>
        <div className="mt-0.5 text-[12.5px] text-ink-4">
          Run more than one JSS 1 or SSS 1? Add each as its own class and name the arms anything — Emerald, Sapphire, Science, A, B…
        </div>
      </div>
      {classes.length === 0 ? (
        <div className="px-5 pb-6 text-[13px] text-ink-4">No classes yet — add your first below.</div>
      ) : (
        <div className="divide-y divide-border border-t border-border">
          {classes.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              {editing === c.id ? (
                <EditRow c={c} onClose={() => setEditing(null)} />
              ) : (
                <>
                  <span className="min-w-[140px] text-[13px] font-medium text-ink">
                    {c.name}
                    {c.arm ? <span className="text-forest"> {c.arm}</span> : ""}
                  </span>
                  <Pill tone="neutral">{c.studentCount} students</Pill>
                  <span className="ml-auto flex gap-1">
                    <button onClick={() => setEditing(c.id)} title="Rename" className="rounded-[7px] p-1.5 text-ink-3 hover:bg-secondary hover:text-ink">
                      <Icon name="edit" size={15} />
                    </button>
                    <form action={deleteClass} className="inline">
                      <input type="hidden" name="id" value={c.id} />
                      <button title="Delete" className="rounded-[7px] p-1.5 text-ink-3 hover:bg-red-soft hover:text-red">
                        <Icon name="trash" size={15} />
                      </button>
                    </form>
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      <AddRow />
    </Card>
  );
}
