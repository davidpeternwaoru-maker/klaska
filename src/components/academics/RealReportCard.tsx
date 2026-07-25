"use client";

// The real, printable report card — same formal sheet design as the prototype,
// driven entirely by the school's saved data: their branding, their term,
// their grading bands, the student's actual scores, class averages, positions
// and attendance. Print/PDF via the existing .k-print rules in globals.css.

import { Button } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { KLogo } from "@/components/ui/Icon";
import type { StudentCardData, Band } from "@/lib/reportcard";

export type CardSchool = {
  name: string;
  logoUrl: string | null;
  motto: string | null;
  address: string | null;
  email: string | null;
  session: string;
  termLabel: string;
  termEnds: string | null;
};

function ord(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function Ri({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-1.5">
      <span className="text-ink-4">{k}:</span>
      <span className="font-semibold text-ink">{v}</span>
    </div>
  );
}
function Sr({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-line py-0.5 last:border-0">
      <span className="text-ink-4">{k}</span>
      <span className="font-bold text-ink">{v}</span>
    </div>
  );
}

export function RealReportCard({
  school,
  klassLabel,
  card,
  numberInClass,
  bands,
  onClose,
  remarkEditor,
}: {
  school: CardSchool;
  klassLabel: string;
  card: StudentCardData;
  numberInClass: number;
  bands: Band[];
  onClose: () => void;
  remarkEditor?: React.ReactNode;
}) {
  const hue = (() => {
    let h = 0;
    for (let i = 0; i < card.studentId.length; i++) h = (h * 31 + card.studentId.charCodeAt(i)) % 360;
    return h;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[840px]" onClick={(e) => e.stopPropagation()}>
        <div className="k-noprint mb-2 flex items-center justify-end gap-2">
          <Button kind="ghost" size="sm" icon="reports" onClick={() => window.print()}>
            Print / PDF
          </Button>
          <Button kind="dark" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        {remarkEditor}

        <div className="k-print rounded-[var(--radius-card)] border border-ink-2 bg-white p-5" style={{ color: "#1a1a18" }}>
          {/* header — the school's own branding */}
          <div className="flex items-center gap-3 border-b-2 border-forest pb-3">
            {school.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={school.logoUrl} alt={school.name} className="h-14 w-14 flex-none rounded-[var(--radius-card)] object-contain" />
            ) : (
              <span className="flex h-14 w-14 flex-none items-center justify-center rounded-[var(--radius-card)] bg-forest-soft">
                <KLogo size={40} />
              </span>
            )}
            <div className="flex-1 text-center">
              <div className="font-display text-[20px] font-bold uppercase tracking-wide text-forest">{school.name}</div>
              <div className="text-[10.5px] text-ink-3">
                {school.address ?? ""}
                {school.address && school.email ? " · " : ""}
                {school.email ?? ""}
              </div>
              {school.motto && <div className="text-[10px] italic text-ink-4">“{school.motto}”</div>}
              <div className="mt-1 inline-block rounded bg-ink px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">Terminal Report Sheet</div>
            </div>
            <div className="w-16 flex-none text-right text-[10px] text-ink-4">
              {school.termLabel}
              <br />
              {school.session}
            </div>
          </div>

          {/* student info */}
          <div className="mt-3 flex gap-3">
            <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1.5 text-[11.5px]">
              <Ri k="Name" v={card.name} />
              <Ri k="Admission No." v={card.admissionNo ?? "—"} />
              <Ri k="Class" v={klassLabel} />
              <Ri k="Sex" v={card.gender === "F" ? "Female" : card.gender === "M" ? "Male" : "—"} />
              <Ri k="No. in Class" v={String(numberInClass)} />
              <Ri k="Position" v={card.position ? `${ord(card.position)} of ${numberInClass}` : "—"} />
            </div>
            <div className="flex h-24 w-20 flex-none flex-col items-center justify-center rounded border border-dashed border-ink-3 text-center">
              <Avatar name={card.name} hue={hue} size={44} />
              <span className="mt-1 text-[8px] text-ink-4">PASSPORT</span>
            </div>
          </div>

          {/* subjects — real scores */}
          {card.subjects.length === 0 ? (
            <p className="mt-4 rounded bg-secondary p-3 text-[12px] text-ink-3">No scores entered for this term yet — enter them under Academics → Results Entry.</p>
          ) : (
            <table className="mt-3 w-full border-collapse text-[10.5px]">
              <thead>
                <tr className="bg-forest-soft">
                  {["Subject", "CA1 (20)", "CA2 (20)", "Exam (60)", "Total", "Grade", "Pos.", "Class Avg", "Remark"].map((h) => (
                    <th key={h} className="border border-line-2 px-1.5 py-1 text-left font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {card.subjects.map((r) => (
                  <tr key={r.subject}>
                    <td className="border border-line-2 px-1.5 py-1 font-semibold">{r.subject}</td>
                    <td className="border border-line-2 px-1.5 py-1 text-center">{r.ca1 ?? "—"}</td>
                    <td className="border border-line-2 px-1.5 py-1 text-center">{r.ca2 ?? "—"}</td>
                    <td className="border border-line-2 px-1.5 py-1 text-center">{r.exam ?? "—"}</td>
                    <td className="border border-line-2 px-1.5 py-1 text-center font-bold">{r.total ?? "—"}</td>
                    <td className="border border-line-2 px-1.5 py-1 text-center font-bold">{r.grade ?? "—"}</td>
                    <td className="border border-line-2 px-1.5 py-1 text-center">{r.pos ? ord(r.pos) : "—"}</td>
                    <td className="border border-line-2 px-1.5 py-1 text-center">{r.classAvg ?? "—"}</td>
                    <td className="border border-line-2 px-1.5 py-1">{r.remark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* summary + attendance */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded border border-line-2 p-2 text-[11px]">
              <div className="mb-1 text-[9px] font-bold uppercase text-ink-4">Summary</div>
              <Sr k="Total obtainable" v={String(card.obtainable)} />
              <Sr k="Total obtained" v={String(card.obtained)} />
              <Sr k="Average" v={card.average != null ? `${card.average}%` : "—"} />
              <Sr k="Overall position" v={card.position ? `${ord(card.position)} of ${numberInClass}` : "—"} />
              <Sr k="Attendance" v={card.daysRecorded ? `${card.present} / ${card.daysRecorded} days recorded` : "—"} />
            </div>
            <div className="rounded border border-line-2 p-2">
              <div className="mb-1 text-[9px] font-bold uppercase text-ink-4">Remarks</div>
              <div className="mb-2">
                <div className="text-[9px] font-semibold text-ink-4">Class teacher</div>
                {card.classTeacherRemark ? (
                  <div className="min-h-8 whitespace-pre-wrap text-[10px] leading-snug text-ink-2">{card.classTeacherRemark}</div>
                ) : (
                  <div className="h-8 border-b border-dashed border-line-2" />
                )}
              </div>
              <div>
                <div className="text-[9px] font-semibold text-ink-4">Principal</div>
                <div className="h-8 border-b border-dashed border-line-2" />
              </div>
            </div>
          </div>

          {/* the school's own grading key */}
          <div className="mt-3 flex items-center justify-between border-t border-line-2 pt-2 text-[9.5px] text-ink-3">
            <div>
              <b>Grading key:</b>{" "}
              {bands.length ? bands.map((b) => `${b.label} ${b.minScore}–${b.maxScore}`).join(" · ") : "—"}
            </div>
            {school.termEnds && (
              <div className="text-right">
                <b>Term ends:</b> {school.termEnds}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
