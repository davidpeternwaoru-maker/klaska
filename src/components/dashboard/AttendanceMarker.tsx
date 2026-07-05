"use client";

// The marking grid. Local state holds each student's status (seeded from any
// marks already saved for the day, else Present). Saving sends the whole set to
// the server action in one transaction.

import { useMemo, useState, useTransition } from "react";
import { Card, Pill } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { saveAttendance } from "@/lib/actions/attendance";
import { ATT_STATUSES, ATT_META, type AttendanceStatus } from "@/lib/attendance";

type Student = { id: string; name: string };

export function AttendanceMarker({
  classId,
  date,
  students,
  existing,
  readOnly = false,
}: {
  classId: string;
  date: string;
  students: Student[];
  existing: Record<string, string>;
  readOnly?: boolean;
}) {
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>(() =>
    Object.fromEntries(students.map((s) => [s.id, (existing[s.id] as AttendanceStatus) ?? "PRESENT"])),
  );
  const [pending, startTransition] = useTransition();
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = (id: string, status: AttendanceStatus) => {
    setMarks((m) => ({ ...m, [id]: status }));
    setSavedMsg(null);
  };
  const allPresent = () => {
    setMarks(Object.fromEntries(students.map((s) => [s.id, "PRESENT" as AttendanceStatus])));
    setSavedMsg(null);
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
    for (const s of students) c[marks[s.id]]++;
    return c;
  }, [marks, students]);

  const save = () =>
    startTransition(async () => {
      setError(null);
      const res = await saveAttendance(
        classId,
        date,
        students.map((s) => ({ studentId: s.id, status: marks[s.id] })),
      );
      if (res.ok) setSavedMsg(`Saved ${res.saved} marks.`);
      else setError(res.error ?? "Could not save.");
    });

  return (
    <Card pad={0} className="mt-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {ATT_STATUSES.map((s) => (
            <Pill key={s} tone={ATT_META[s].tone}>
              {counts[s]} {ATT_META[s].label.toLowerCase()}
            </Pill>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {readOnly && <Pill tone="neutral">View only — your role sees attendance but doesn&apos;t mark it</Pill>}
          {!readOnly && <button onClick={allPresent} className="h-9 rounded-[9px] border border-border px-3 text-[12.5px] font-medium text-ink-2 hover:bg-secondary">
            Mark all present
          </button>}
          {!readOnly && <button onClick={save} disabled={pending} className="h-9 rounded-[9px] bg-forest px-4 text-[13px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60">
            {pending ? "Saving…" : "Save attendance"}
          </button>}
        </div>
      </div>

      {(savedMsg || error) && (
        <div className={`px-4 pb-2 text-[12.5px] font-medium ${error ? "text-red" : "text-green"}`}>{error ?? savedMsg}</div>
      )}

      <div className="max-h-[60vh] overflow-auto border-t border-border">
        <table className="w-full border-collapse text-[13px]">
          <tbody>
            {students.map((s, i) => (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="w-8 px-4 py-2 text-ink-4">{i + 1}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={s.name} size={28} />
                    <span className="font-medium text-ink">{s.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1">
                    {ATT_STATUSES.map((st) => {
                      const active = marks[s.id] === st;
                      const m = ATT_META[st];
                      const color =
                        m.tone === "green" ? "var(--color-green)" : m.tone === "red" ? "var(--color-red)" : m.tone === "amber" ? "var(--color-amber)" : "var(--color-ink-3)";
                      return (
                        <button
                          key={st}
                          disabled={readOnly}
                          onClick={() => set(s.id, st)}
                          title={m.label}
                          className="flex h-7 w-7 items-center justify-center rounded-[7px] text-[12px] font-bold transition"
                          style={{
                            background: active ? color : "var(--color-secondary)",
                            color: active ? "#fff" : "var(--color-ink-4)",
                          }}
                        >
                          {m.short}
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
