"use client";

// Role-specific Overview dashboards (Matrix §5: "Overview — each role sees the
// version relevant to them"). Bursar = finance view; Teacher = own classes.

import Link from "next/link";
import { Card, SectionTitle, Pill } from "@/components/ui/primitives";
import { KPI } from "@/components/ui/KPI";
import { Avatar } from "@/components/ui/Avatar";
import { Icon, type IconName } from "@/components/ui/Icon";

const ngn = (n: number) => "₦" + n.toLocaleString("en-NG");
const hueOf = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

function QuickActions({ items }: { items: { href: string; label: string; icon: IconName }[] }) {
  return (
    <Card>
      <div className="mb-3 text-body font-semibold text-ink">Quick actions</div>
      <div className="flex flex-col gap-2">
        {items.map((q) => (
          <Link key={q.href} href={q.href} className="flex items-center gap-2.5 rounded-[var(--radius-card)] border border-border px-3 py-2.5 text-[13px] font-medium text-ink-2 transition hover:bg-secondary">
            <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-forest-soft text-forest">
              <Icon name={q.icon} size={15} />
            </span>
            {q.label}
          </Link>
        ))}
      </div>
    </Card>
  );
}

/* ---------------- Bursar: the money overview ---------------- */
export function BursarOverview({
  greet,
  schoolName,
  money,
  recentPayments,
}: {
  greet: string;
  schoolName: string;
  money: { invoiced: number; collected: number; outstanding: number; owingCount: number };
  recentPayments: { id: string; student: string; amount: number; method: string; when: string }[];
}) {
  const rate = money.invoiced ? Math.round((money.collected / money.invoiced) * 100) : 0;
  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle
        eyebrow="Overview · Finance"
        title={`Welcome, ${greet}`}
        sub={`${schoolName}'s money at a glance — your bursar view.`}
        right={
          <Link href="/finance/fees" className="inline-flex items-center gap-1.5 rounded-[var(--radius-card)] bg-forest px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-forest-2">
            <Icon name="fees" size={15} /> Fees & payments
          </Link>
        }
      />
      <div className="k-stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI label="Collected this term" value={ngn(money.collected)} delta={`${rate}% of invoiced`} deltaTone="green" sub="" icon="fees" />
        <KPI label="Outstanding" value={ngn(money.outstanding)} delta={`${money.owingCount} students owing`} deltaTone="red" sub="" icon="wallet" />
        <KPI label="Invoiced" value={ngn(money.invoiced)} delta="this term" sub="" icon="receipt" />
        <KPI label="Collection rate" value={`${rate}%`} delta="of billed fees" deltaTone={rate >= 70 ? "green" : "amber"} sub="" icon="trend" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card pad={0} className="overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between p-5">
            <div className="text-body font-semibold text-ink">Recent payments</div>
            <Link href="/finance/system" className="text-[12.5px] font-medium text-forest hover:underline">Financial system →</Link>
          </div>
          {recentPayments.length === 0 ? (
            <div className="px-5 pb-10 pt-2 text-center text-[13px] text-ink-4">No payments recorded yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {recentPayments.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-2.5">
                  <Avatar name={p.student} hue={hueOf(p.id)} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{p.student}</span>
                    <span className="block text-[11.5px] text-ink-4">{p.when} · {p.method.toLowerCase()}</span>
                  </span>
                  <span className="font-semibold text-green">{ngn(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <QuickActions
          items={[
            { href: "/finance/fees", label: "Record a payment", icon: "fees" },
            { href: "/finance/system", label: "Log an expense", icon: "receipt" },
            { href: "/finance/system", label: "Financial system", icon: "finance" },
            { href: "/settings", label: "Fee setup", icon: "settings" },
          ]}
        />
      </div>
    </div>
  );
}

/* ---------------- Teacher: my classes overview ---------------- */
export function TeacherOverview({
  greet,
  schoolName,
  ownedClass,
  teaching,
  presentToday,
  myStudents,
}: {
  greet: string;
  schoolName: string;
  ownedClass: { id: string; label: string; students: number } | null;
  teaching: { subject: string; classes: string[] }[];
  presentToday: number;
  myStudents: number;
}) {
  const presentPct = myStudents ? Math.round((presentToday / myStudents) * 100) : 0;
  const subjectCount = teaching.length;
  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle
        eyebrow="Overview · My teaching"
        title={`Welcome, ${greet}`}
        sub={ownedClass ? `Form teacher of ${ownedClass.label} at ${schoolName}.` : `Your subjects at ${schoolName} today.`}
        right={
          <Link href="/academics/results" className="inline-flex items-center gap-1.5 rounded-[var(--radius-card)] bg-forest px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-forest-2">
            <Icon name="edit" size={15} /> Enter scores
          </Link>
        }
      />
      <div className="k-stagger grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KPI label="Subjects I teach" value={String(subjectCount)} delta={ownedClass ? "+ form class" : "subject teacher"} sub="" icon="book" />
        <KPI label="My students" value={String(myStudents)} delta="across your classes" sub="" icon="students" />
        <KPI label="Present today" value={`${presentPct}%`} delta={`${presentToday}/${myStudents}`} deltaTone="green" sub="" icon="attendance" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          {/* Owned (form) class — shown distinctly */}
          <Card pad={0} className="overflow-hidden">
            <div className="p-5 text-body font-semibold text-ink">My form class</div>
            {ownedClass ? (
              <div className="flex items-center gap-3 border-t border-border px-5 py-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-card)] bg-forest text-white"><Icon name="layers" size={18} /></span>
                <span className="flex-1">
                  <span className="block text-[14px] font-semibold text-ink">{ownedClass.label}</span>
                  <span className="block text-[12px] text-ink-4">You own this class — daily register &amp; report-card remarks</span>
                </span>
                <Pill tone="forest">{ownedClass.students} students</Pill>
                <Link href={`/people/attendance?classId=${ownedClass.id}`} className="text-[12.5px] font-medium text-forest hover:underline">Register →</Link>
              </div>
            ) : (
              <div className="border-t border-border px-5 py-6 text-center text-[13px] text-ink-4">You&apos;re a subject teacher — no form class assigned.</div>
            )}
          </Card>

          {/* Subject assignments */}
          <Card pad={0} className="overflow-hidden">
            <div className="p-5 text-body font-semibold text-ink">Subjects I teach</div>
            {teaching.length === 0 ? (
              <div className="border-t border-border px-5 pb-10 pt-4 text-center text-[13px] text-ink-4">
                No subject assignments yet — ask your principal to assign your subjects and classes under People → Staff.
              </div>
            ) : (
              <div className="divide-y divide-border border-t border-border">
                {teaching.map((t) => (
                  <div key={t.subject} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[var(--radius-card)] bg-forest-soft text-forest"><Icon name="book" size={16} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-medium text-ink">{t.subject}</span>
                      <span className="block text-[12px] text-ink-4">{t.classes.join(" · ")}</span>
                    </span>
                    <Link href="/academics/results" className="text-[12.5px] font-medium text-forest hover:underline">Scores →</Link>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
        <QuickActions
          items={[
            { href: "/academics/results", label: "Enter scores", icon: "edit" },
            { href: "/people/attendance", label: "Take attendance", icon: "attendance" },
            { href: "/academics/report-cards", label: "Report cards", icon: "reports" },
            { href: "/people/students", label: "My students", icon: "students" },
          ]}
        />
      </div>
    </div>
  );
}
