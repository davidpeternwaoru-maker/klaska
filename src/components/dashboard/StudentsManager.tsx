"use client";

// Client UI for students. The table data comes from the server (props); after
// any create/update/delete the server action calls revalidatePath, so Next
// re-renders this page with fresh data automatically — no manual refetch.

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, Pill } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { createStudent, updateStudent, deleteStudent, type ActionState } from "@/lib/actions/students";

export type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  admissionNo: string | null;
  gender: string | null;
  dob: string | null; // ISO date or null
  guardianName: string | null;
  guardianPhone: string | null;
  classId: string | null;
  className: string | null;
};
export type ClassOption = { id: string; label: string };

const input =
  "h-9 w-full rounded-[9px] border border-border bg-secondary px-2.5 text-[13px] text-ink outline-none focus:border-forest-line focus:bg-card";

function Fields({ student, classes }: { student?: StudentRow; classes: ClassOption[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block">
        <span className="mb-1 block text-[11.5px] font-medium text-ink-3">First name *</span>
        <input name="firstName" required defaultValue={student?.firstName} className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Last name *</span>
        <input name="lastName" required defaultValue={student?.lastName} className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Gender</span>
        <select name="gender" defaultValue={student?.gender ?? ""} className={input}>
          <option value="">—</option>
          <option value="M">Male</option>
          <option value="F">Female</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Date of birth</span>
        <input name="dob" type="date" defaultValue={student?.dob ?? ""} className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Class</span>
        <select name="classId" defaultValue={student?.classId ?? ""} className={input}>
          <option value="">Unassigned</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Admission no.</span>
        <input name="admissionNo" defaultValue={student?.admissionNo ?? ""} placeholder="Auto if blank" className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Guardian name</span>
        <input name="guardianName" defaultValue={student?.guardianName ?? ""} className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-[11.5px] font-medium text-ink-3">Guardian phone</span>
        <input name="guardianPhone" defaultValue={student?.guardianPhone ?? ""} className={input} />
      </label>
    </div>
  );
}

function AddForm({ classes }: { classes: ClassOption[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createStudent, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok, state]);

  return (
    <Card>
      <div className="mb-3 text-[14px] font-semibold text-ink">Add a student</div>
      <form ref={ref} action={action} className="flex flex-col gap-3">
        <Fields classes={classes} />
        {state.error && <p className="text-[12.5px] font-medium text-red">{state.error}</p>}
        {state.ok && <p className="text-[12.5px] font-medium text-green">Saved.</p>}
        <div>
          <button disabled={pending} className="h-9 rounded-[9px] bg-forest px-4 text-[13px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60">
            {pending ? "Saving…" : "Add student"}
          </button>
        </div>
      </form>
    </Card>
  );
}

function EditModal({ student, classes, onClose }: { student: StudentRow; classes: ClassOption[]; onClose: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateStudent, {});
  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, state, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="mt-10 w-full max-w-[560px]" onClick={(e) => e.stopPropagation()}>
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[14px] font-semibold text-ink">Edit student</div>
            <button onClick={onClose} className="text-ink-4 hover:text-ink">
              <Icon name="x" size={18} />
            </button>
          </div>
          <form action={action} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={student.id} />
            <Fields student={student} classes={classes} />
            {state.error && <p className="text-[12.5px] font-medium text-red">{state.error}</p>}
            <div className="flex gap-2">
              <button disabled={pending} className="h-9 rounded-[9px] bg-forest px-4 text-[13px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60">
                {pending ? "Saving…" : "Save changes"}
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

export function StudentsManager({ students, classes }: { students: StudentRow[]; classes: ClassOption[] }) {
  const [editing, setEditing] = useState<StudentRow | null>(null);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
      <Card pad={0} className="overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <div className="text-[14px] font-semibold text-ink">Students</div>
          <Pill tone="neutral">{students.length}</Pill>
        </div>
        {students.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 pb-9 pt-5 text-center">
            <div className="text-[13px] text-ink-4">No students yet.</div>
            <Link href="/people/students/import" className="text-[13px] font-medium text-forest hover:underline">
              Import a list from a spreadsheet →
            </Link>
            <div className="text-[12px] text-ink-4">or add one with the form on the right.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-y border-border text-[11px] uppercase tracking-[0.05em] text-ink-4">
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">Adm. no.</th>
                  <th className="px-4 py-2 text-left font-medium">Class</th>
                  <th className="px-4 py-2 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                    <td className="px-4 py-2.5 font-medium text-ink">
                      {s.firstName} {s.lastName}
                    </td>
                    <td className="px-4 py-2.5 text-ink-3">{s.admissionNo ?? "—"}</td>
                    <td className="px-4 py-2.5">{s.className ? <Pill tone="forest">{s.className}</Pill> : <span className="text-ink-4">Unassigned</span>}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setEditing(s)} title="Edit" className="rounded-[7px] p-1.5 text-ink-3 hover:bg-secondary hover:text-ink">
                          <Icon name="edit" size={15} />
                        </button>
                        <form action={deleteStudent}>
                          <input type="hidden" name="id" value={s.id} />
                          <button title="Delete" className="rounded-[7px] p-1.5 text-ink-3 hover:bg-red-soft hover:text-red">
                            <Icon name="trash" size={15} />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AddForm classes={classes} />
      {editing && <EditModal student={editing} classes={classes} onClose={() => setEditing(null)} />}
    </div>
  );
}
