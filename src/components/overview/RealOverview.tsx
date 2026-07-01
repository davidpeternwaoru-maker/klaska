"use client";

// The home dashboard, in the polished design but driven by the school's REAL
// data (counts, recent enrolments) fetched on the server.

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
}: {
  schoolName: string;
  userName: string;
  counts: { students: number; staff: number; classes: number; present: number };
  recent: Recent[];
}) {
  const presentPct = counts.students ? Math.round((counts.present / counts.students) * 100) : 0;

  const quick: { href: string; label: string; icon: IconName }[] = [
    { href: "/dashboard/students/import", label: "Import students", icon: "download" },
    { href: "/dashboard/attendance", label: "Take attendance", icon: "attendance" },
    { href: "/dashboard/results", label: "Enter results", icon: "reports" },
    { href: "/dashboard/settings", label: "School settings", icon: "settings" },
  ];

  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle
        eyebrow="Overview"
        title={`Welcome, ${userName.split(" ")[0]}`}
        sub={`Here's ${schoolName} today.`}
        right={
          <Link href="/people/students" className="inline-flex items-center gap-1.5 rounded-[10px] bg-forest px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-forest-2">
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

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* recent enrolments */}
        <Card pad={0} className="overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between p-5">
            <div className="text-[14px] font-semibold text-ink">Recent enrolments</div>
            <Link href="/people/students" className="text-[12.5px] font-medium text-forest hover:underline">View all →</Link>
          </div>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 pb-10 pt-4 text-center">
              <div className="text-[13px] text-ink-4">No students yet.</div>
              <Link href="/dashboard/students/import" className="text-[13px] font-medium text-forest hover:underline">Import your student list →</Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recent.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-5 py-2.5">
                  <Avatar name={s.name} hue={hueOf(s.id)} size={32} />
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
          <div className="mb-3 text-[14px] font-semibold text-ink">Quick actions</div>
          <div className="flex flex-col gap-2">
            {quick.map((q) => (
              <Link key={q.href} href={q.href} className="flex items-center gap-2.5 rounded-[10px] border border-border px-3 py-2.5 text-[13px] font-medium text-ink-2 transition hover:bg-secondary">
                <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-forest-soft text-forest">
                  <Icon name={q.icon} size={15} />
                </span>
                {q.label}
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
