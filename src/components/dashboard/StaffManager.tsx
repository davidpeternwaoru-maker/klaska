"use client";

// Client UI for staff. Adding a staff member also sets their initial login
// password, so they can sign in immediately. Only owners/bursars see this work
// (the server action enforces it regardless of the UI).

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Card, Pill } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { createStaff, deleteStaff, resetStaffPassword, type ActionState } from "@/lib/actions/staff";
import { getTeachingAction, setFormClassAction, addAssignmentAction, removeAssignmentAction } from "@/lib/actions/teaching";
import type { TeacherTeaching, TeachingOptions } from "@/server/services/teaching";

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "HOS" | "BURSAR" | "HOD" | "TEACHER" | "ADMIN";
  title: string | null;
  phone: string | null;
  isSelf: boolean;
};

const input =
  "h-9 w-full rounded-[9px] border border-border bg-secondary px-2.5 text-[13px] text-ink outline-none focus:border-forest-line focus:bg-card";

const roleTone: Record<StaffRow["role"], "forest" | "amber" | "neutral" | "blue"> = {
  OWNER: "forest",
  HOS: "blue",
  BURSAR: "amber",
  HOD: "blue",
  TEACHER: "neutral",
  ADMIN: "neutral",
};
const roleLabel: Record<StaffRow["role"], string> = {
  OWNER: "owner",
  HOS: "principal",
  BURSAR: "bursar",
  HOD: "HOD",
  TEACHER: "teacher",
  ADMIN: "admin officer",
};

function AddForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createStaff, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok, state]);

  return (
    <Card>
      <div className="mb-3 text-body font-semibold text-ink">Add staff</div>
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
              <option value="HOS">Principal (HOS)</option>
              <option value="BURSAR">Bursar</option>
              <option value="HOD">Head of Department</option>
              <option value="ADMIN">Admin Officer</option>
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

function ResetModal({ staff, onClose }: { staff: StaffRow; onClose: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(resetStaffPassword, {});
  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, state, onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="mt-16 w-full max-w-[420px]" onClick={(e) => e.stopPropagation()}>
        <Card>
          <div className="mb-1 text-body font-semibold text-ink">Reset password</div>
          <div className="mb-3 text-[12.5px] text-ink-4">
            Set a new password for <span className="font-medium text-ink-2">{staff.name}</span>. Share it with them; they can sign in immediately.
          </div>
          <form action={action} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={staff.id} />
            <input
              name="password"
              type="text"
              required
              placeholder="New password (min. 6 chars)"
              className="h-9 w-full rounded-[9px] border border-border bg-secondary px-2.5 text-[13px] text-ink outline-none focus:border-forest-line focus:bg-card"
            />
            {state.error && <p className="text-[12.5px] font-medium text-red">{state.error}</p>}
            <div className="flex gap-2">
              <button disabled={pending} className="h-9 rounded-[9px] bg-forest px-4 text-[13px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60">
                {pending ? "Saving…" : "Set password"}
              </button>
              <button type="button" onClick={onClose} className="h-9 rounded-[9px] border border-border px-4 text-[13px] font-medium text-ink-2 hover:bg-secondary">
                Cancel
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

function TeachingModal({ staff, options, onClose }: { staff: StaffRow; options: TeachingOptions; onClose: () => void }) {
  const [data, setData] = useState<TeacherTeaching | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [subjectId, setSubjectId] = useState("");
  const [classId, setClassId] = useState("");

  async function reload() {
    const r = await getTeachingAction(staff.id);
    if (r.ok) setData(r.data);
    else setErr(r.error);
  }
  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => { setErr(null); const r = await fn(); if (!r.ok) setErr(r.error ?? "Something went wrong."); await reload(); });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="mt-10 w-full max-w-[560px]" onClick={(e) => e.stopPropagation()}>
        <Card>
          <div className="mb-1 flex items-center justify-between">
            <div className="text-body font-semibold text-ink">Teaching duties</div>
            <button onClick={onClose} className="rounded-[7px] p-1.5 text-ink-3 hover:bg-secondary"><Icon name="x" size={16} /></button>
          </div>
          <div className="mb-4 text-[12.5px] text-ink-4">Set <span className="font-medium text-ink-2">{staff.name}</span>&apos;s form class and the subjects they teach in each class. These are independent — a teacher can have either, both, or neither.</div>

          {/* Form teacher */}
          <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-ink-4">Form teacher of</div>
          <select
            value={data?.formClassId ?? ""}
            disabled={!data || pending}
            onChange={(e) => act(() => setFormClassAction(staff.id, e.target.value || null))}
            className={input}
          >
            <option value="">— No form class (subject teacher only) —</option>
            {options.classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <div className="mt-1 text-[11px] text-ink-4">A teacher owns at most one class. Choosing a class releases any class they previously owned.</div>

          {/* Subject assignments */}
          <div className="mt-5 mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-ink-4">Subjects taught (subject × class)</div>
          {data && data.assignments.length > 0 ? (
            <div className="mb-3 flex flex-col gap-1.5">
              {data.assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-[9px] bg-secondary px-3 py-2 text-[12.5px]">
                  <span className="text-ink"><span className="font-medium">{a.subjectName}</span> <span className="text-ink-4">in</span> {a.classLabel}</span>
                  <button disabled={pending} onClick={() => act(() => removeAssignmentAction(a.id))} title="Remove" className="rounded-[6px] p-1 text-ink-3 hover:bg-red-soft hover:text-red disabled:opacity-50"><Icon name="trash" size={14} /></button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-3 rounded-[9px] bg-secondary px-3 py-2.5 text-[12px] text-ink-4">No subjects assigned yet.</div>
          )}

          <div className="flex items-end gap-2">
            <label className="flex-1">
              <span className="mb-1 block text-[11px] text-ink-4">Subject</span>
              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={input}>
                <option value="">Pick subject…</option>
                {options.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="flex-1">
              <span className="mb-1 block text-[11px] text-ink-4">Class</span>
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className={input}>
                <option value="">Pick class…</option>
                {options.classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <button
              disabled={pending || !subjectId || !classId}
              onClick={() => act(async () => { const r = await addAssignmentAction(staff.id, subjectId, classId); if (r.ok) { setSubjectId(""); setClassId(""); } return r; })}
              className="h-9 flex-none rounded-[9px] bg-forest px-4 text-[13px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-50"
            >
              Add
            </button>
          </div>

          {err && <p className="mt-3 text-[12.5px] font-medium text-red">{err}</p>}
          <div className="mt-4 flex justify-end">
            <button onClick={onClose} className="h-9 rounded-[9px] border border-border px-4 text-[13px] font-medium text-ink-2 hover:bg-secondary">Done</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function StaffManager({ staff, canManageTeaching = false, options = { classes: [], subjects: [] } }: { staff: StaffRow[]; canManageTeaching?: boolean; options?: TeachingOptions }) {
  const [resetting, setResetting] = useState<StaffRow | null>(null);
  const [teaching, setTeaching] = useState<StaffRow | null>(null);
  const showTeach = (s: StaffRow) => canManageTeaching && (s.role === "TEACHER" || s.role === "HOD");
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
      <Card pad={0} className="overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <div className="text-body font-semibold text-ink">Staff</div>
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
                    <Pill tone={roleTone[s.role]}>{roleLabel[s.role]}</Pill>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {showTeach(s) && (
                        <button onClick={() => setTeaching(s)} title="Teaching duties" className="rounded-[7px] p-1.5 text-ink-3 hover:bg-secondary hover:text-ink">
                          <Icon name="book" size={15} />
                        </button>
                      )}
                      <button onClick={() => setResetting(s)} title="Reset password" className="rounded-[7px] p-1.5 text-ink-3 hover:bg-secondary hover:text-ink">
                        <Icon name="refresh" size={15} />
                      </button>
                      {s.isSelf ? (
                        <span className="px-1 text-[11.5px] text-ink-4">you</span>
                      ) : (
                        <form action={deleteStaff} className="inline">
                          <input type="hidden" name="id" value={s.id} />
                          <button title="Remove" className="rounded-[7px] p-1.5 text-ink-3 hover:bg-red-soft hover:text-red">
                            <Icon name="trash" size={15} />
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AddForm />
      {resetting && <ResetModal staff={resetting} onClose={() => setResetting(null)} />}
      {teaching && <TeachingModal staff={teaching} options={options} onClose={() => setTeaching(null)} />}
    </div>
  );
}
