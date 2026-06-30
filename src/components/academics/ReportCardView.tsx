"use client";

import { useState } from "react";
import { Button } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { KLogo } from "@/components/ui/Icon";
import { SCHOOL } from "@/data/overview";
import { buildReportCard } from "@/data/academics";
import { type Student } from "@/data/people";

const ADDRESS = "12 Admiralty Way, Lekki Phase 1, Lagos · admin@greenfield.ng";

function Rate({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="h-2 w-2 rounded-full" style={{ background: i <= n ? "var(--color-forest)" : "var(--color-line-2)" }} />
      ))}
    </span>
  );
}
function Ri({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-1.5">
      <span className="text-ink-4">{k}:</span>
      <span className="font-semibold text-ink">{v}</span>
    </div>
  );
}
function ord(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function ReportCardView({ student, onClose }: { student: Student; onClose: () => void }) {
  const rc = buildReportCard(student);
  const [teacher, setTeacher] = useState("");
  const [principal, setPrincipal] = useState("");

  const aiTeacher = () => {
    if (rc.kind === "academic") {
      setTeacher(
        rc.average >= 70
          ? `${student.firstName} has had an excellent term and shows strong mastery across subjects. A hardworking, focused student — keep it up.`
          : rc.average >= 50
            ? `${student.firstName} performed creditably this term. With more consistency in the weaker subjects, even better results are within reach.`
            : `${student.firstName} struggled this term and needs closer support. A structured study plan next term is strongly advised.`,
      );
    } else {
      setTeacher(`${student.firstName} is settling in well and growing in confidence. With gentle encouragement at home, ${student.firstName} will continue to flourish.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[820px]" onClick={(e) => e.stopPropagation()}>
        <div className="k-noprint mb-2 flex items-center justify-end gap-2">
          <Button kind="ghost" size="sm" icon="sparkle" onClick={aiTeacher}>
            Generate remark with AI
          </Button>
          <Button kind="ghost" size="sm" icon="reports" onClick={() => window.print()}>
            Print / PDF
          </Button>
          <Button kind="dark" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="k-print rounded-[10px] border border-ink-2 bg-white p-5" style={{ color: "#1a1a18" }}>
          {/* header */}
          <div className="flex items-center gap-3 border-b-2 border-forest pb-3">
            <span className="flex h-14 w-14 flex-none items-center justify-center rounded-[12px] bg-forest-soft">
              <KLogo size={40} />
            </span>
            <div className="flex-1 text-center">
              <div className="font-display text-[20px] font-bold uppercase tracking-wide text-forest">{SCHOOL.name}</div>
              <div className="text-[10.5px] text-ink-3">{ADDRESS}</div>
              <div className="mt-1 inline-block rounded bg-ink px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">Terminal Report Sheet</div>
            </div>
            <div className="w-14 flex-none text-right text-[10px] text-ink-4">
              {SCHOOL.term}
              <br />
              {SCHOOL.session}
            </div>
          </div>

          {/* student info */}
          <div className="mt-3 flex gap-3">
            <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1.5 text-[11.5px]">
              <Ri k="Name" v={student.name} />
              <Ri k="Admission No." v={student.admissionNo} />
              <Ri k="Class" v={rc.klass} />
              <Ri k="Department" v={rc.kind === "academic" ? rc.dept ?? "—" : "—"} />
              <Ri k="Sex" v={student.gender === "F" ? "Female" : "Male"} />
              <Ri k="Age" v={`${rc.age} yrs`} />
              {rc.kind === "academic" && <Ri k="No. in Class" v={String(rc.numberInClass)} />}
              {rc.kind === "academic" && <Ri k="Position" v={`${ord(rc.position)} of ${rc.numberInClass}`} />}
            </div>
            <div className="flex h-24 w-20 flex-none flex-col items-center justify-center rounded border border-dashed border-ink-3 text-center">
              <Avatar name={student.name} hue={student.hue} size={44} />
              <span className="mt-1 text-[8px] text-ink-4">PASSPORT</span>
            </div>
          </div>

          {rc.kind === "academic" ? (
            <>
              {/* subjects */}
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
                  {rc.subjects.map((r) => (
                    <tr key={r.subject}>
                      <td className="border border-line-2 px-1.5 py-1 font-semibold">{r.subject}</td>
                      <td className="border border-line-2 px-1.5 py-1 text-center">{r.ca1}</td>
                      <td className="border border-line-2 px-1.5 py-1 text-center">{r.ca2}</td>
                      <td className="border border-line-2 px-1.5 py-1 text-center">{r.exam}</td>
                      <td className="border border-line-2 px-1.5 py-1 text-center font-bold">{r.total}</td>
                      <td className="border border-line-2 px-1.5 py-1 text-center font-bold">{r.grade}</td>
                      <td className="border border-line-2 px-1.5 py-1 text-center">{ord(r.subjPos)}</td>
                      <td className="border border-line-2 px-1.5 py-1 text-center">{r.classAvg}</td>
                      <td className="border border-line-2 px-1.5 py-1">{r.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* summary + affective */}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded border border-line-2 p-2 text-[11px]">
                  <div className="mb-1 text-[9px] font-bold uppercase text-ink-4">Summary</div>
                  <Sr k="Total obtainable" v={String(rc.obtainable)} />
                  <Sr k="Total obtained" v={String(rc.obtained)} />
                  <Sr k="Average" v={`${rc.average}%`} />
                  <Sr k="Overall position" v={`${ord(rc.position)} of ${rc.numberInClass}`} />
                  <Sr k="Attendance" v={`${rc.present} / ${rc.totalDays} days`} />
                </div>
                <div className="rounded border border-line-2 p-2">
                  <div className="mb-1 text-[9px] font-bold uppercase text-ink-4">Affective & psychomotor</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10.5px]">
                    {rc.affective.map((a) => (
                      <div key={a.trait} className="flex items-center justify-between">
                        <span>{a.trait}</span>
                        <Rate n={a.score} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* developmental */}
              <table className="mt-3 w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-forest-soft">
                    <th className="border border-line-2 px-2 py-1 text-left font-bold">Developmental area</th>
                    <th className="border border-line-2 px-2 py-1 text-left font-bold">Rating</th>
                    <th className="border border-line-2 px-2 py-1 text-left font-bold">Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {rc.skills.map((sk) => (
                    <tr key={sk.label}>
                      <td className="border border-line-2 px-2 py-1 font-semibold">{sk.label}</td>
                      <td className="border border-line-2 px-2 py-1">{sk.rating}</td>
                      <td className="border border-line-2 px-2 py-1 text-ink-3">
                        {sk.rating === "Excellent" ? "Confident and consistent" : sk.rating === "Developing" ? "Progressing well with support" : "Needs more practice"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 rounded bg-secondary p-2 text-[11.5px] italic text-ink-3">“{rc.comment}”</p>
            </>
          )}

          {/* remarks */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase text-ink-4">Class teacher&apos;s remark</div>
              <textarea value={teacher} onChange={(e) => setTeacher(e.target.value)} rows={2} placeholder="Type remark, or Generate with AI…" className="w-full rounded border border-line-2 p-2 text-[11px] outline-none focus:border-forest" />
            </div>
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase text-ink-4">Principal&apos;s remark</div>
              <textarea value={principal} onChange={(e) => setPrincipal(e.target.value)} rows={2} placeholder="Type remark…" className="w-full rounded border border-line-2 p-2 text-[11px] outline-none focus:border-forest" />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-line-2 pt-2 text-[9.5px] text-ink-3">
            <div>
              <b>Grading key:</b> A1 75–100 · B2/B3 65–74 · C4–C6 50–64 · D7/E8 40–49 · F9 0–39
            </div>
            <div className="text-right">
              <b>Next term begins:</b> Mon 14 Sept 2026
            </div>
          </div>
        </div>
      </div>
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
