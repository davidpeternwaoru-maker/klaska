"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Pill, Button, Divider } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { useOffline } from "@/lib/offline/useOffline";
import {
  studentById,
  niceClass,
  effStatus,
  getAcademics,
  getAttendance,
  getFeesLedger,
  getHistory,
  type Status,
  type Student,
} from "@/data/people";
import { ngn } from "@/data/overview";
import { deptIdOf, getDeptName } from "@/data/academics";
import { usePromotions, getPromoHistory } from "@/lib/promotions/promotionsStore";

const STATUS_TONE: Record<Status, "green" | "blue" | "amber"> = { active: "green", graduated: "blue", left: "amber" };
const STATUS_LABEL: Record<Status, string> = { active: "Active", graduated: "Graduated", left: "Left" };
const TABS = ["Bio", "Guardians", "Academics", "Attendance", "Fees", "History"] as const;
type Tab = (typeof TABS)[number];

export function StudentProfile({ studentId }: { studentId: string }) {
  usePromotions(); // re-render when promotions change
  const s = studentById(studentId);
  const [tab, setTab] = useState<Tab>("Bio");
  const { enqueue } = useOffline();
  const [flash, setFlash] = useState<string | null>(null);

  function action(label: string, type: string, payload: unknown) {
    enqueue(type, payload);
    setFlash(label);
    setTimeout(() => setFlash(null), 2200);
  }

  if (!s) {
    return (
      <div className="mx-auto max-w-[1040px]">
        <Link href="/people/students" className="text-[13px] font-medium text-forest hover:underline">
          ← Back to students
        </Link>
        <p className="mt-4 text-ink-3">Student not found.</p>
      </div>
    );
  }

  const outstanding = Math.max(0, s.termFee - s.paid);

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
            <Pill tone={STATUS_TONE[effStatus(s)]}>{STATUS_LABEL[effStatus(s)]}</Pill>
          </div>
          <div className="mt-1 text-[13px] text-ink-3">
            {niceClass(s)} · {s.admissionNo} · admitted {s.admittedOn}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {flash && (
            <span className="inline-flex items-center gap-1 rounded-full bg-forest-soft px-2.5 py-1 text-[12px] font-medium text-forest">
              <Icon name="check" size={13} /> {flash}
            </span>
          )}
          <Button kind="ghost" size="sm" icon="arrowU" onClick={() => action("Promotion queued", "students.promote", { id: s.id })}>
            Promote
          </Button>
          <Button kind="primary" size="sm" icon="fees" onClick={() => action("Payment recorded", "fees.recordPayment", { id: s.id })}>
            Record payment
          </Button>
        </div>
      </Card>

      {/* tabs */}
      <div className="mt-5 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative px-3.5 py-2.5 text-[13px] font-medium transition ${
              tab === t ? "text-forest" : "text-ink-3 hover:text-ink"
            }`}
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
        {tab === "Fees" && <FeesTab s={s} outstanding={outstanding} />}
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

function BioTab({ s }: { s: Student }) {
  return (
    <Card>
      <div className="grid grid-cols-2 gap-x-8 gap-y-5 md:grid-cols-3">
        <Field label="Full name" value={s.name} />
        <Field label="Gender" value={s.gender === "F" ? "Female" : "Male"} />
        <Field label="Date of birth" value={s.dob} />
        <Field label="Admission no." value={s.admissionNo} />
        <Field label="Class" value={niceClass(s)} />
        {s.level.startsWith("SSS") && <Field label="Department" value={getDeptName(deptIdOf(s))} />}
        <Field label="Admitted" value={s.admittedOn} />
        <Field label="Status" value={STATUS_LABEL[s.status]} />
        {s.exitedOn && <Field label={s.status === "graduated" ? "Graduated" : "Left"} value={s.exitedOn} />}
        {s.leftReason && <Field label="Reason" value={s.leftReason} />}
      </div>
    </Card>
  );
}

function GuardiansTab({ s }: { s: Student }) {
  return (
    <Card>
      <div className="flex items-center gap-3.5">
        <Avatar name={s.guardianName} hue={(s.hue + 120) % 360} size={44} />
        <div>
          <div className="text-[15px] font-semibold text-ink">{s.guardianName}</div>
          <div className="text-[12.5px] text-ink-4">{s.guardianRelation}</div>
        </div>
      </div>
      <div className="my-5">
        <Divider />
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-5">
        <Field label="Phone" value={s.guardianPhone} />
        <Field label="Email" value={s.guardianEmail} />
      </div>
    </Card>
  );
}

function AcademicsTab({ s }: { s: Student }) {
  const acad = getAcademics(s);
  if (acad.kind === "developmental") {
    return (
      <Card>
        <div className="mb-4 text-[14px] font-semibold text-ink">Developmental report</div>
        <div className="flex flex-col">
          {acad.skills.map((sk) => (
            <div key={sk.label} className="flex items-center justify-between border-b border-border py-3 last:border-0">
              <span className="text-[13px] font-medium text-ink">{sk.label}</span>
              <Pill tone={sk.rating === "Excellent" ? "green" : sk.rating === "Developing" ? "amber" : "red"}>{sk.rating}</Pill>
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-[12px] bg-secondary p-4 text-[13px] italic text-ink-3">“{acad.comment}”</p>
      </Card>
    );
  }
  return (
    <Card pad={0} className="overflow-hidden">
      <div className="flex items-center justify-between p-5">
        <div className="text-[14px] font-semibold text-ink">Current term results</div>
        <div className="flex gap-2">
          <Pill tone="neutral">Average {acad.average}%</Pill>
          <Pill tone="forest">Position {acad.position}</Pill>
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
          {acad.subjects.map((r) => (
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

function AttendanceTab({ s }: { s: Student }) {
  const att = getAttendance(s);
  return (
    <Card>
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Attendance rate" value={`${att.rate}%`} tone="forest" />
        <Stat label="Days late" value={String(att.late)} tone="amber" />
        <Stat label="Days absent" value={String(att.absent)} tone="red" />
      </div>
      <div className="mt-5 text-[12px] font-medium text-ink-4">Last 10 school days</div>
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
    </Card>
  );
}

function FeesTab({ s, outstanding }: { s: Student; outstanding: number }) {
  const ledger = getFeesLedger(s);
  return (
    <Card pad={0} className="overflow-hidden">
      <div className="grid grid-cols-3 gap-4 p-5">
        <Stat label="Term fee" value={ngn(s.termFee)} tone="neutral" />
        <Stat label="Paid" value={ngn(s.paid)} tone="forest" />
        <Stat label="Outstanding" value={ngn(outstanding)} tone={outstanding > 0 ? "red" : "forest"} />
      </div>
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
          {ledger.map((r, i) => (
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
    </Card>
  );
}

function HistoryTab({ s }: { s: Student }) {
  const events = [...getPromoHistory(s.id), ...getHistory(s)];
  return (
    <Card>
      <div className="flex flex-col">
        {events.map((e, i) => (
          <div key={i} className="flex gap-3.5">
            <div className="flex flex-col items-center">
              <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-forest ring-4 ring-forest-soft" />
              {i < events.length - 1 && <span className="my-1 w-px flex-1 bg-border" />}
            </div>
            <div className="pb-5">
              <div className="text-[13px] font-semibold text-ink">{e.title}</div>
              <div className="text-[12px] text-ink-4">
                {e.date} · {e.meta}
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
    <div className="rounded-[12px] bg-secondary p-4">
      <div className="text-[11.5px] font-medium text-ink-4">{label}</div>
      <div className="mt-1 font-display text-[19px] font-bold tracking-[-0.02em]" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
