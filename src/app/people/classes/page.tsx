import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { classScope } from "@/lib/auth/scope";
import { canManageClasses } from "@/lib/auth/permissions";
import { Card, Pill, SectionTitle } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { ClassesManager, type ClassRow, type TeacherOption } from "@/components/dashboard/ClassesManager";

export const metadata = { title: "Classes · Klaska" };

// Matrix: Owner/HOS manage classes. Teachers see ONLY their own classes,
// read-only; Bursar/Admin see the list read-only.
export default async function Page() {
  const user = await requireUser();
  const manage = canManageClasses(user.role);

  const [classes, staff] = await Promise.all([
    prisma.class.findMany({
      where: classScope(user),
      include: { teacher: true, _count: { select: { students: true } } },
      orderBy: [{ name: "asc" }, { arm: "asc" }],
    }),
    manage ? prisma.staff.findMany({ where: { schoolId: user.schoolId }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  const rows: ClassRow[] = classes.map((c) => ({
    id: c.id,
    name: c.name,
    arm: c.arm,
    teacherName: c.teacher?.name ?? null,
    studentCount: c._count.students,
  }));

  if (manage) {
    const teachers: TeacherOption[] = staff.map((s) => ({ id: s.id, name: s.name }));
    return (
      <div className="mx-auto max-w-[1320px]">
        <SectionTitle eyebrow="People" title="Classes" sub="Your classes and arms, with form teachers and student counts." />
        <ClassesManager classes={rows} teachers={teachers} />
      </div>
    );
  }

  // read-only view (teacher: own classes only)
  return (
    <div className="mx-auto max-w-[1000px]">
      <SectionTitle
        eyebrow="People"
        title={user.role === "TEACHER" ? "My classes" : "Classes"}
        sub={user.role === "TEACHER" ? "The classes assigned to you." : "The school's classes — view only for your role."}
      />
      <Card pad={0} className="overflow-hidden">
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-[13px] text-ink-4">
            {user.role === "TEACHER" ? "No classes assigned to you yet — ask your admin to set you as form teacher." : "No classes yet."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-forest-soft text-forest">
                  <Icon name="layers" size={16} />
                </span>
                <span className="flex-1 text-[13.5px] font-medium text-ink">{c.arm ? `${c.name} ${c.arm}` : c.name}</span>
                {c.teacherName && <span className="text-[12.5px] text-ink-4">{c.teacherName}</span>}
                <Pill tone="neutral">{c.studentCount} students</Pill>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
