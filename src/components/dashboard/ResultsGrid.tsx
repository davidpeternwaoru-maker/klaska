"use client";

// Score entry grid for one class + one subject. Each row has CA1/CA2/Exam
// inputs; total and grade are computed live as you type (and again, definitively,
// on the server when you save).

import { useMemo, useState, useTransition } from "react";
import { Card, Pill } from "@/components/ui/primitives";
import { saveResults } from "@/lib/actions/results";
import { gradeFor, gradeTone, CA1_MAX, CA2_MAX, EXAM_MAX } from "@/lib/results";

export type ExistingResult = { ca1: number | null; ca2: number | null; exam: number | null; total: number | null; grade: string | null; subjectRemark: string | null };
type Student = { id: string; name: string };
type Cells = { ca1: string; ca2: string; exam: string; remark: string };

const toStr = (n: number | null) => (n == null ? "" : String(n));

function rowTotal(c: Cells): { total: number | null; grade: string | null } {
  const has = c.ca1 !== "" || c.ca2 !== "" || c.exam !== "";
  if (!has) return { total: null, grade: null };
  const clamp = (v: string, max: number) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
  const total = clamp(c.ca1, CA1_MAX) + clamp(c.ca2, CA2_MAX) + clamp(c.exam, EXAM_MAX);
  return { total, grade: gradeFor(total) };
}

export function ResultsGrid({
  classId,
  subjectId,
  students,
  existing,
  readOnly = false,
}: {
  classId: string;
  subjectId: string;
  students: Student[];
  existing: Record<string, ExistingResult>;
  readOnly?: boolean;
}) {
  const [cells, setCells] = useState<Record<string, Cells>>(() =>
    Object.fromEntries(
      students.map((s) => {
        const e = existing[s.id];
        return [s.id, { ca1: toStr(e?.ca1 ?? null), ca2: toStr(e?.ca2 ?? null), exam: toStr(e?.exam ?? null), remark: e?.subjectRemark ?? "" }];
      }),
    ),
  );
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = (id: string, key: keyof Cells, value: string) => {
    setCells((c) => ({ ...c, [id]: { ...c[id], [key]: value } }));
    setMsg(null);
  };

  const entered = useMemo(() => students.filter((s) => rowTotal(cells[s.id]).total != null).length, [cells, students]);

  const save = () =>
    startTransition(async () => {
      setError(null);
      const res = await saveResults(
        subjectId,
        classId,
        students.map((s) => ({ studentId: s.id, ca1: cells[s.id].ca1, ca2: cells[s.id].ca2, exam: cells[s.id].exam, subjectRemark: cells[s.id].remark })),
      );
      if (res.ok) setMsg(`Saved ${res.saved} results.`);
      else setError(res.error ?? "Could not save.");
    });

  const inp = "h-8 w-14 rounded-[7px] border border-border bg-secondary px-1.5 text-center text-[13px] text-ink outline-none focus:border-forest-line focus:bg-card";

  return (
    <Card pad={0} className="mt-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <Pill tone="neutral">{entered}/{students.length} entered</Pill>
        {readOnly ? <Pill tone="neutral">View only — your role sees scores but doesn&apos;t enter them</Pill> : <button onClick={save} disabled={pending} className="h-9 rounded-[9px] bg-forest px-4 text-[13px] font-semibold text-white transition hover:bg-forest-2 disabled:opacity-60">
          {pending ? "Saving…" : "Save results"}
        </button>}
      </div>
      {(msg || error) && <div className={`px-4 pb-2 text-[12.5px] font-medium ${error ? "text-red" : "text-green"}`}>{error ?? msg}</div>}

      <div className="max-h-[60vh] overflow-auto border-t border-border">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border text-[11px] uppercase tracking-[0.05em] text-ink-4">
              <th className="px-4 py-2 text-left font-medium">Student</th>
              <th className="px-2 py-2 text-center font-medium">CA1 /20</th>
              <th className="px-2 py-2 text-center font-medium">CA2 /20</th>
              <th className="px-2 py-2 text-center font-medium">Exam /60</th>
              <th className="px-2 py-2 text-center font-medium">Total</th>
              <th className="px-3 py-2 text-center font-medium">Grade</th>
              <th className="px-3 py-2 text-left font-medium">Subject remark</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const c = cells[s.id];
              const { total, grade } = rowTotal(c);
              return (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-1.5 font-medium text-ink">{s.name}</td>
                  <td className="px-2 py-1.5 text-center"><input inputMode="numeric" disabled={readOnly} value={c.ca1} onChange={(e) => set(s.id, "ca1", e.target.value)} className={inp} /></td>
                  <td className="px-2 py-1.5 text-center"><input inputMode="numeric" disabled={readOnly} value={c.ca2} onChange={(e) => set(s.id, "ca2", e.target.value)} className={inp} /></td>
                  <td className="px-2 py-1.5 text-center"><input inputMode="numeric" disabled={readOnly} value={c.exam} onChange={(e) => set(s.id, "exam", e.target.value)} className={inp} /></td>
                  <td className="px-2 py-1.5 text-center font-semibold text-ink">{total ?? "—"}</td>
                  <td className="px-3 py-1.5 text-center">{grade ? <Pill tone={gradeTone(grade)}>{grade}</Pill> : <span className="text-ink-4">—</span>}</td>
                  <td className="px-3 py-1.5"><input disabled={readOnly} value={c.remark} onChange={(e) => set(s.id, "remark", e.target.value)} placeholder="optional…" className="h-8 w-full min-w-[160px] rounded-[7px] border border-border bg-secondary px-2 text-[12.5px] text-ink outline-none focus:border-forest-line focus:bg-card" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
