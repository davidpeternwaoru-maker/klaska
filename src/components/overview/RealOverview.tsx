"use client";

// The home dashboard, in the polished design but driven by the school's REAL
// data (counts, recent enrolments) fetched on the server.
// Reference screen for the Phase 5 visual language: five-step type scale,
// 12px card radius, motion tokens, spacing on the 4/8/12/16/24 grid.

import Link from "next/link";
import { Card, SectionTitle, Pill } from "@/components/ui/primitives";
import { KPI } from "@/components/ui/KPI";
import { Avatar } from "@/components/ui/Avatar";
import { Icon, type IconName } from "@/components/ui/Icon";

type Recent = { id: string; name: string; admissionNo: string | null; className: string | null };

// deterministic soft colour from an id, so avatars aren't all the same
const hueOf = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

export function RealOverview({
  schoolName,
  userName,
  counts,
  recent,
  money = null,
  variant = "full",
}: {
  schoolName: string;
  userName: string;
  counts: { students: number; staff: number; classes: number; present: number };
  recent: Recent[];
  money?: { collected: number; outstanding: number } | null;
  variant?: "full" | "academic" | "basic";
}) {
  const greet = (() => {
    const parts = userName.trim().split(/\s+/);
    return /^(mr|mrs|ms|miss|dr|chief|engr|prof)\.?$/i.test(parts[0]) && parts[1] ? parts.slice(0, 2).join(" ") : parts[0];
  })();
  const presentPct = counts.students ? Math.round((counts.present / counts.students) * 100) : 0;

  // Quick actions differ per role (Matrix: Owner full, HOS/HOD academic, Admin basic).
  const quick: { href: string; label: string; icon: IconName }[] =
    variant === "academic"
      ? [
          { href: "/people/attendance", label: "Take attendance", icon: "attendance" },
          { href: "/academics/results", label: "Enter results", icon: "edit" },
          { href: "/academics/report-cards", label: "Report cards", icon: "reports" },
          { href: "/academics/analysis", label: "Report analysis", icon: "trend" },
        ]
      : variant === "basic"
        ? [
            { href: "/people/students/import", label: "Import students", icon: "download" },
            { href: "/people/students/manage", label: "Add a student", icon: "plus" },
            { href: "/people/students", label: "View students", icon: "students" },
            { href: "/people/attendance", label: "View attendance", icon: "attendance" },
          ]
        : [
            { href: "/people/students/import", label: "Import students", icon: "download" },
            { href: "/people/attendance", label: "Take attendance", icon: "attendance" },
            { href: "/academics/results", label: "Enter results", icon: "reports" },
            { href: "/settings", label: "School settings", icon: "settings" },
          ];

  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle
        eyebrow="Overview"
        title={`Welcome, ${greet}`}
        sub={`Here's ${schoolName} today.`}
        right={
          <Link
            href="/people/students"
            className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-card)] bg-forest px-4 text-[13px] font-semibold text-white transition-[background-color,transform] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-forest-2 active:scale-[0.98]"
          >
            <Icon name="students" size={15} /> View students
          </Link>
        }
      />

      {/* KPI row — real numbers */}
      <div className="k-stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI label="Students" value={String(counts.students)} delta="enrolled" sub="" icon="students" />
        <KPI label="Staff" value={String(counts.staff)} delta="team" sub="" icon="badge" />
        <KPI label="Classes" value={String(counts.classes)} delta="set up" sub="" icon="layers" />
        <KPI label="Present today" value={`${presentPct}%`} delta={`${counts.present}/${counts.students}`} deltaTone="green" sub="" icon="attendance" />
      </div>

      {money && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <KPI label="Fees collected (term)" value={"₦" + money.collected.toLocaleString("en-NG")} delta="real payments" deltaTone="green" sub="" icon="fees" />
          <KPI label="Outstanding" value={"₦" + money.outstanding.toLocaleString("en-NG")} delta="to collect" deltaTone="red" sub="" icon="wallet" />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* recent enrolments */}
        <Card pad={0} className="overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <h2 className="text-body font-semibold text-ink">Recent enrolments</h2>
            <Link href="/people/students" className="text-caption font-medium text-forest transition-colors duration-[var(--dur-fast)] hover:text-forest-2">
              View all →
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 pb-12 pt-4 text-center">
              <div className="text-caption text-ink-4">No students yet.</div>
              <Link href="/people/students/import" className="text-caption font-medium text-forest hover:text-forest-2">
                Import your student list →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recent.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-6 py-3 transition-colors duration-[var(--dur-fast)] hover:bg-secondary/50">
                  <Avatar name={s.name} hue={hueOf(s.id)} size={34} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{s.name}</span>
                    <span className="block text-[11.5px] text-ink-4">{s.admissionNo ?? "—"}</span>
                  </span>
                  {s.className ? <Pill tone="forest">{s.className}</Pill> : <Pill tone="neutral">Unassigned</Pill>}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* quick actions */}
        <Card>
          <h2 className="mb-4 text-body font-semibold text-ink">Quick actions</h2>
          <div className="flex flex-col gap-2">
            {quick.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="group flex items-center gap-3 rounded-[var(--radius-card)] border border-border px-3 py-2.5 text-[13px] font-medium text-ink-2 transition-[background-color,border-color] duration-[var(--dur-fast)] hover:border-forest-line hover:bg-forest-soft/40 hover:text-ink"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-forest-soft text-forest transition-transform duration-[var(--dur-fast)] group-hover:scale-105">
                  <Icon name={q.icon} size={15} />
                </span>
                {q.label}
                <Icon name="chevR" size={14} className="ml-auto text-ink-4 transition-transform duration-[var(--dur-fast)] group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
