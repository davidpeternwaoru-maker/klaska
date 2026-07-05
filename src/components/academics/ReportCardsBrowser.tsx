"use client";

// Class report-card browser: pick a class, see students ranked by real average,
// open anyone's printable report card.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Pill } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { RealReportCard, type CardSchool } from "./RealReportCard";
import type { StudentCardData, Band } from "@/lib/reportcard";

const hueOf = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};
const ord = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export function ReportCardsBrowser({
  classes,
  classId,
  school,
  klassLabel,
  cards,
  numberInClass,
  bands,
}: {
  classes: { value: string; label: string }[];
  classId: string;
  school: CardSchool;
  klassLabel: string;
  cards: StudentCardData[];
  numberInClass: number;
  bands: Band[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState<StudentCardData | null>(null);
  const ranked = [...cards].sort((a, b) => (b.average ?? -1) - (a.average ?? -1));

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-[12.5px] text-ink-4">
          <Icon name="filter" size={15} /> Class
        </span>
        <select
          value={classId}
          onChange={(e) => router.push(`/academics/report-cards?classId=${encodeURIComponent(e.target.value)}`)}
          className="h-9 rounded-[9px] border border-border bg-secondary px-2.5 text-[13px] text-ink outline-none focus:border-forest-line focus:bg-card"
        >
          {classes.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <Pill tone="neutral">{cards.length} students</Pill>
      </div>

      <Card pad={0} className="overflow-hidden">
        {cards.length === 0 ? (
          <div className="px-4 py-10 text-center text-[13px] text-ink-4">No students in this class yet.</div>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-[0.05em] text-ink-4">
                <th className="w-10 px-4 py-2.5 text-left font-medium">Pos</th>
                <th className="px-4 py-2.5 text-left font-medium">Student</th>
                <th className="px-4 py-2.5 text-left font-medium">Subjects scored</th>
                <th className="px-4 py-2.5 text-right font-medium">Average</th>
                <th className="px-4 py-2.5 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((c) => (
                <tr key={c.studentId} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/50">
                  <td className="px-4 py-2.5 font-semibold text-ink-4">{c.position ? ord(c.position) : "—"}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => setOpen(c)} className="flex items-center gap-2.5 text-left">
                      <Avatar name={c.name} hue={hueOf(c.studentId)} size={30} />
                      <span className="font-medium text-ink hover:text-forest">{c.name}</span>
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-ink-3">{c.subjects.filter((s) => s.total != null).length}</td>
                  <td className="px-4 py-2.5 text-right">
                    {c.average != null ? (
                      <Pill tone={c.average >= 65 ? "green" : c.average >= 50 ? "amber" : "red"}>{c.average}%</Pill>
                    ) : (
                      <span className="text-ink-4">no scores</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => setOpen(c)} className="rounded-[8px] border border-border px-2.5 py-1.5 text-[12px] font-medium text-ink-2 transition hover:bg-secondary">
                      Open report card
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {open && (
        <RealReportCard school={school} klassLabel={klassLabel} card={open} numberInClass={numberInClass} bands={bands} onClose={() => setOpen(null)} />
      )}
    </>
  );
}
