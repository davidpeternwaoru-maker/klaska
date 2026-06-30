// Overview page — counts come straight from Postgres, so they reflect exactly
// what's saved. Add a student on the Students page and this number goes up.

import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { Icon, type IconName } from "@/components/ui/Icon";

function ChecklistStep({ done, n, href, title, hint, cta }: { done: boolean; n: number; href: string; title: string; hint: string; cta: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[12px] border border-border p-3">
      <span
        className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-[12px] font-bold"
        style={{ background: done ? "var(--color-forest)" : "var(--color-secondary)", color: done ? "#fff" : "var(--color-ink-4)" }}
      >
        {done ? <Icon name="check" size={15} /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <div className={`text-[13px] font-medium ${done ? "text-ink-4 line-through" : "text-ink"}`}>{title}</div>
        <div className="text-[11.5px] text-ink-4">{hint}</div>
      </div>
      {!done && (
        <Link href={href} className="flex-none rounded-[9px] bg-forest px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-forest-2">
          {cta}
        </Link>
      )}
    </div>
  );
}

export default async function OverviewPage() {
  const user = await requireUser();
  const where = { schoolId: user.schoolId };
  const [students, staff, classes] = await Promise.all([
    prisma.student.count({ where }),
    prisma.staff.count({ where }),
    prisma.class.count({ where }),
  ]);

  const stats: { label: string; value: number; icon: IconName; href: string }[] = [
    { label: "Students", value: students, icon: "students", href: "/dashboard/students" },
    { label: "Staff", value: staff, icon: "badge", href: "/dashboard/staff" },
    { label: "Classes", value: classes, icon: "layers", href: "/dashboard/classes" },
  ];

  return (
    <div className="mx-auto max-w-[1100px]">
      <SectionTitle eyebrow="Dashboard" title={`Welcome, ${user.name.split(" ")[0]}`} sub="Your live school data, saved to the database." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card hover className="flex items-center gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-forest-soft text-forest">
                <Icon name={s.icon} size={20} />
              </span>
              <div>
                <div className="font-display text-[26px] font-bold leading-none text-ink">{s.value}</div>
                <div className="mt-1 text-[12.5px] text-ink-4">{s.label}</div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6">
        <div className="text-[14px] font-semibold text-ink">Set up your school</div>
        <div className="mt-1 text-[12.5px] text-ink-4">Three steps to get going. They tick off automatically as you go.</div>
        <div className="mt-4 flex flex-col gap-2">
          <ChecklistStep done={classes > 0} n={1} href="/dashboard/classes" title="Create your classes" hint="e.g. JSS 1, Primary 4" cta="Add classes" />
          <ChecklistStep done={staff > 1} n={2} href="/dashboard/staff" title="Add your staff" hint="give each a login & role" cta="Add staff" />
          <ChecklistStep done={students > 0} n={3} href="/dashboard/students/import" title="Import your students" hint="upload a spreadsheet — done in seconds" cta="Import students" />
        </div>
      </Card>
    </div>
  );
}
