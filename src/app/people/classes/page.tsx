import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SectionTitle } from "@/components/ui/primitives";
import { ClassesManager, type ClassRow, type TeacherOption } from "@/components/dashboard/ClassesManager";

export default async function Page() {
  const user = await requireUser();
  const [classes, staff] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId: user.schoolId },
      include: { teacher: true, _count: { select: { students: true } } },
      orderBy: [{ name: "asc" }, { arm: "asc" }],
    }),
    prisma.staff.findMany({ where: { schoolId: user.schoolId }, orderBy: { name: "asc" } }),
  ]);

  const rows: ClassRow[] = classes.map((c) => ({
    id: c.id,
    name: c.name,
    arm: c.arm,
    teacherName: c.teacher?.name ?? null,
    studentCount: c._count.students,
  }));
  const teachers: TeacherOption[] = staff.map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle eyebrow="People" title="Classes" sub="Your classes and arms, with form teachers and student counts." />
      <ClassesManager classes={rows} teachers={teachers} />
    </div>
  );
}
