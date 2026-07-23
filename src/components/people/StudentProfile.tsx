"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Pill, Divider } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { TranscriptDialog } from "./TranscriptDialog";
import type { ProfileData } from "@/lib/students-profile";

const STATUS_TONE = { active: "green", graduated: "blue", left: "amber" } as const;
const STATUS_LABEL = { active: "Active", graduated: "Graduated", left: "Left" } as const;
const TABS = ["Bio", "Guardians", "Academics", "Attendance", "Fees", "History"] as const;
type Tab = (typeof TABS)[number];

const ngn = (n: number) => "₦" + n.toLocaleString("en-NG");

export function StudentProfile({ data }: { data: ProfileData | null }) {
  const [tab, setTab] = useState<Tab>("Bio");

  if (!data) {
    return (
      <div className="mx-auto max-w-[1040px]">
        <Link href="/people/students" className="text-[13px] font-medium text-forest hover:underline">
          ← Back to students
        </Link>
        <p className="mt-4 text-ink-3">Student not found.</p>
      </div>
    );
  }
  const s = data;

  return (
    <div className="mx-auto max-w-[1080px]">
      <Link href="/people/students" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-3 transition hover:text-forest">
        <Icon name="arrowR" size={14} style={{ transform: "rotate(180deg)" }} /> Back to students
      </Link>

      {/* header */}
      <Card pad={20} className="mt-4 flex flex-wrap items-center gap-5">
        <Avatar name={s.name} hue={s.hue} size={60} ring />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-[22px] font-bold tracking-[-0.02em] text-ink">{s.name}</h1>
            <Pill tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Pill>
          </div>
          <div className="mt-1 text-[13px] text-ink-3">
            {s.className} · {s.admissionNo ?? "no admission no."} · admitted {s.admittedOn}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {s.canGenerateTranscript && <TranscriptDialog studentId={s.id} studentName={s.name} />}
          <Link href="/people/promotions" className="inline-flex items-center gap-1.5 rounded-[var(--radius-card)] border border-border px-3 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-secondary">
            <Icon name="arrowU" size={15} /> Promote
          </Link>
          <Link href="/finance/fees" className="inline-flex items-center gap-1.5 rounded-[var(--radius-card)] bg-forest px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-forest-2">
            <Icon name="fees" size={15} /> Record payment
          </Link>
        </div>
      </Card>

      {/* tabs */}
      <div className="mt-5 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative px-3.5 py-2.5 text-[13px] font-medium transition ${tab === t ? "text-forest" : "text-ink-3 hover:text-ink"}`}
          >
            {t}
            {tab === t && <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-forest" />}
          </button>
        ))}
      </div>

      <div className="mt-5 k-rise">
        {tab === "Bio" && <BioTab s={s} />}
        {tab === "Guardians" && <GuardiansTab s={s} />}
        {tab === "Academics" && <AcademicsTab s={s} />}
        {tab === "Attendance" && <AttendanceTab s={s} />}
        {tab === "Fees" && <FeesTab s={s} />}
        {tab === "History" && <HistoryTab s={s} />}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11.5px] font-medium text-ink-4">{label}</div>
      <div className="mt-1 text-[14px] font-medium text-ink">{value}</div>
    </div>
  );
}

function BioTab({ s }: { s: ProfileData }) {
  return (
    <Card>
      <div className="grid grid-cols-2 gap-x-8 gap-y-5 md:grid-cols-3">
        <Field label="Full name" value={s.name} />
        <Field label="Gender" value={s.gender === "F" ? "Female" : s.gender === "M" ? "Male" : "—"} />
        <Field label="Date of birth" value={s.dob} />
        <Field label="Admission no." value={s.admissionNo ?? "—"} />
        <Field label="Class" value={s.className} />
        {s.isSenior && s.department && <Field label="Department" value={s.department} />}
        <Field label="Admitted" value={s.admittedOn} />
        <Field label="Status" value={STATUS_LABEL[s.status]} />
        {s.exitedOn && <Field label={s.status === "graduated" ? "Graduated" : "Left"} value={s.exitedOn} />}
        {s.leftReason && <Field label="Reason" value={s.leftReason} />}
      </div>
    </Card>
  );
}

function GuardiansTab({ s }: { s: ProfileData }) {
  if (!s.guardian) {
    return (
      <Card>
        <p className="text-[13px] text-ink-4">No guardian on record for this student yet.</p>
      </Card>
    );
  }
  const g = s.guardian;
  return (
    <Card>
      <div className="flex items-center gap-3.5">
        <Avatar name={g.name} hue={(s.hue + 120) % 360} size={44} />
        <div>
          <div className="text-[15px] font-semibold text-ink">{g.name}</div>
          <div className="text-[12.5px] text-ink-4">{g.relation ?? "Guardian"}</div>
        </div>
      </div>
      <div className="my-5">
        <Divider />
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-5">
        <Field label="Phone" value={g.phone ?? "—"} />
        <Field label="Email" value={g.email ?? "—"} />
      </div>
    </Card>
  );
}

function AcademicsTab({ s }: { s: ProfileData }) {
  const a = s.academics;
  if (a.subjects.length === 0) {
    return (
      <Card>
        <p className="text-[13px] text-ink-4">No results recorded for this student this term yet.</p>
      </Card>
    );
  }
  return (
    <Card pad={0} className="overflow-hidden">
      <div className="flex items-center justify-between p-5">
        <div className="text-body font-semibold text-ink">Current term results</div>
        <div className="flex gap-2">
          <Pill tone="neutral">Average {a.average}%</Pill>
          {a.position > 0 && <Pill tone="forest">Position {a.position} of {a.classSize}</Pill>}
        </div>
      </div>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-y border-border text-[11px] uppercase tracking-[0.05em] text-ink-4">
            <th className="px-5 py-2.5 text-left font-medium">Subject</th>
            <th className="px-3 py-2.5 text-right font-medium">CA1</th>
            <th className="px-3 py-2.5 text-right font-medium">CA2</th>
            <th className="px-3 py-2.5 text-right font-medium">Exam</th>
            <th className="px-3 py-2.5 text-right font-medium">Total</th>
            <th className="px-5 py-2.5 text-right font-medium">Grade</th>
          </tr>
        </thead>
        <tbody>
          {a.subjects.map((r) => (
            <tr key={r.subject} className="border-b border-border last:border-0">
              <td className="px-5 py-3 font-medium text-ink">{r.subject}</td>
              <td className="px-3 py-3 text-right text-ink-3">{r.ca1}</td>
              <td className="px-3 py-3 text-right text-ink-3">{r.ca2}</td>
              <td className="px-3 py-3 text-right text-ink-3">{r.exam}</td>
              <td className="px-3 py-3 text-right font-semibold text-ink">{r.total}</td>
              <td className="px-5 py-3 text-right">
                <Pill tone={r.grade.startsWith("A") ? "green" : r.grade.startsWith("F") ? "red" : "neutral"}>{r.grade}</Pill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function AttendanceTab({ s }: { s: ProfileData }) {
  const att = s.attendance;
  return (
    <Card>
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Attendance rate" value={`${att.rate}%`} tone="forest" />
        <Stat label="Days late" value={String(att.late)} tone="amber" />
        <Stat label="Days absent" value={String(att.absent)} tone="red" />
      </div>
      {att.recent.length > 0 ? (
        <>
          <div className="mt-5 text-[12px] font-medium text-ink-4">Last {att.recent.length} school days</div>
          <div className="mt-2 flex gap-1.5">
            {att.recent.map((d, i) => (
              <span
                key={i}
                title={d}
                className="h-8 flex-1 rounded-[7px]"
                style={{ background: d === "present" ? "var(--color-forest)" : d === "late" ? "var(--color-amber)" : "var(--color-red)" }}
              />
            ))}
          </div>
        </>
      ) : (
        <p className="mt-5 text-[13px] text-ink-4">No attendance recorded yet.</p>
      )}
    </Card>
  );
}

function FeesTab({ s }: { s: ProfileData }) {
  const f = s.fees;
  return (
    <Card pad={0} className="overflow-hidden">
      <div className="grid grid-cols-3 gap-4 p-5">
        <Stat label="Term fee" value={ngn(f.termFee)} tone="neutral" />
        <Stat label="Paid" value={ngn(f.paid)} tone="forest" />
        <Stat label="Outstanding" value={ngn(f.outstanding)} tone={f.outstanding > 0 ? "red" : "forest"} />
      </div>
      {f.ledger.length > 0 ? (
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-y border-border text-[11px] uppercase tracking-[0.05em] text-ink-4">
              <th className="px-5 py-2.5 text-left font-medium">Term</th>
              <th className="px-3 py-2.5 text-right font-medium">Due</th>
              <th className="px-3 py-2.5 text-right font-medium">Paid</th>
              <th className="px-3 py-2.5 text-left font-medium">Method</th>
              <th className="px-5 py-2.5 text-left font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {f.ledger.map((r, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium text-ink">{r.term}</td>
                <td className="px-3 py-3 text-right text-ink-3">{ngn(r.due)}</td>
                <td className="px-3 py-3 text-right font-semibold text-ink">{ngn(r.paid)}</td>
                <td className="px-3 py-3 text-ink-3">{r.method}</td>
                <td className="px-5 py-3 text-ink-3">{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="px-5 pb-5 text-[13px] text-ink-4">No invoices for this student yet.</p>
      )}
    </Card>
  );
}

function HistoryTab({ s }: { s: ProfileData }) {
  if (s.history.length === 0) {
    return (
      <Card>
        <p className="text-[13px] text-ink-4">No history recorded yet.</p>
      </Card>
    );
  }
  return (
    <Card>
      <div className="flex flex-col">
        {s.history.map((e, i) => (
          <div key={i} className="flex gap-3.5">
            <div className="flex flex-col items-center">
              <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-forest ring-4 ring-forest-soft" />
              {i < s.history.length - 1 && <span className="my-1 w-px flex-1 bg-border" />}
            </div>
            <div className="pb-5">
              <div className="text-[13px] font-semibold text-ink">{e.title}</div>
              <div className="text-[12px] text-ink-4">
                {e.date}
                {e.meta ? ` · ${e.meta}` : ""}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "forest" | "amber" | "red" | "neutral" }) {
  const color = tone === "forest" ? "var(--color-forest)" : tone === "amber" ? "var(--color-amber-2)" : tone === "red" ? "var(--color-red)" : "var(--color-ink)";
  return (
    <div className="rounded-[var(--radius-card)] bg-secondary p-4">
      <div className="text-[11.5px] font-medium text-ink-4">{label}</div>
      <div className="mt-1 font-display text-[19px] font-bold tracking-[-0.02em]" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
