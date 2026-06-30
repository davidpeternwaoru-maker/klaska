// Overview page — counts come straight from Postgres, so they reflect exactly
// what's saved. Add a student on the Students page and this number goes up.

import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { Icon, type IconName } from "@/components/ui/Icon";

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
        <div className="text-[14px] font-semibold text-ink">Getting started</div>
        <ol className="mt-3 flex list-decimal flex-col gap-1.5 pl-5 text-[13px] text-ink-2">
          <li>Create your classes (e.g. JSS 1, Primary 4) on the <Link href="/dashboard/classes" className="font-medium text-forest hover:underline">Classes</Link> page.</li>
          <li>Add staff and give each a login on the <Link href="/dashboard/staff" className="font-medium text-forest hover:underline">Staff</Link> page.</li>
          <li>Enrol students and assign them to a class on the <Link href="/dashboard/students" className="font-medium text-forest hover:underline">Students</Link> page.</li>
        </ol>
      </Card>
    </div>
  );
}
