"use client";

// The Students screen in the polished design, driven by REAL data. Viewing +
// search + class filter live here; adding/importing/editing use the working
// management pages under /dashboard/students (linked from the buttons).

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, SectionTitle, Pill } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";

type Student = { id: string; name: string; admissionNo: string | null; gender: string | null; classId: string | null; className: string | null };
type ClassOpt = { id: string; label: string };

const hueOf = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

function CountCard({ label, value, sub, icon }: { label: string; value: number; sub: string; icon: "students" | "layers" | "badge" }) {
  return (
    <Card hover className="flex items-center gap-3.5">
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[12px] bg-forest-soft text-forest">
        <Icon name={icon} size={20} />
      </span>
      <div>
        <div className="font-display text-[24px] font-bold leading-none text-ink">{value}</div>
        <div className="mt-1 text-[12px] text-ink-4">{label}</div>
      </div>
      <span className="ml-auto self-start text-[11px] text-ink-4">{sub}</span>
    </Card>
  );
}

export function RealStudents({ students, classes }: { students: Student[]; classes: ClassOpt[] }) {
  const [q, setQ] = useState("");
  const [classId, setClassId] = useState("all");

  const assigned = students.filter((s) => s.classId).length;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return students.filter((s) => {
      if (classId !== "all" && s.classId !== classId) return false;
      if (term && !s.name.toLowerCase().includes(term) && !(s.admissionNo ?? "").toLowerCase().includes(term)) return false;
      return true;
    });
  }, [students, q, classId]);

  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle
        eyebrow="People"
        title="Students"
        sub="Your enrolled learners, live from your school's records."
        right={
          <>
            <Link href="/people/students/import" className="inline-flex items-center gap-1.5 rounded-[10px] border border-border px-3.5 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-secondary">
              <Icon name="download" size={15} style={{ transform: "rotate(180deg)" }} /> Import
            </Link>
            <Link href="/people/students/manage" className="inline-flex items-center gap-1.5 rounded-[10px] bg-forest px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-forest-2">
              <Icon name="plus" size={15} /> Add student
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <CountCard label="Total students" value={students.length} sub="" icon="students" />
        <CountCard label="Assigned to a class" value={assigned} sub="" icon="layers" />
        <CountCard label="Classes" value={classes.length} sub="" icon="badge" />
      </div>

      <Card pad={0} className="mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border p-3.5">
          <div className="relative min-w-[220px] flex-1">
            <Icon name="search" size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-ink-4)" }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or admission no…"
              className="h-9 w-full rounded-[10px] border border-transparent bg-secondary pl-9 pr-3 text-[13px] outline-none transition placeholder:text-ink-4 focus:border-forest-line focus:bg-card"
            />
          </div>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="h-9 rounded-[10px] border border-border bg-secondary px-2.5 text-[13px] text-ink outline-none focus:border-forest-line focus:bg-card">
            <option value="all">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 pb-10 pt-6 text-center">
            <div className="text-[13px] text-ink-4">{students.length === 0 ? "No students yet." : "No students match your filter."}</div>
            {students.length === 0 && (
              <Link href="/people/students/import" className="text-[13px] font-medium text-forest hover:underline">Import your student list →</Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-[0.05em] text-ink-4">
                  <th className="px-5 py-2.5 text-left font-medium">Student</th>
                  <th className="px-5 py-2.5 text-left font-medium">Admission no.</th>
                  <th className="px-5 py-2.5 text-left font-medium">Gender</th>
                  <th className="px-5 py-2.5 text-left font-medium">Class</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/50">
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={s.name} hue={hueOf(s.id)} size={30} />
                        <span className="font-medium text-ink">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-ink-3">{s.admissionNo ?? "—"}</td>
                    <td className="px-5 py-2.5 text-ink-3">{s.gender === "F" ? "Female" : s.gender === "M" ? "Male" : "—"}</td>
                    <td className="px-5 py-2.5">{s.className ? <Pill tone="forest">{s.className}</Pill> : <span className="text-ink-4">Unassigned</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-border px-5 py-2.5 text-[12px] text-ink-4">Showing {filtered.length} of {students.length}</div>
      </Card>
    </div>
  );
}
