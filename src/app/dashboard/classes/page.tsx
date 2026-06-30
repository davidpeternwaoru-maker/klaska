import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SectionTitle } from "@/components/ui/primitives";
import { ClassesManager, type ClassRow, type TeacherOption } from "@/components/dashboard/ClassesManager";

export default async function ClassesPage() {
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
    <div className="mx-auto max-w-[1100px]">
      <SectionTitle eyebrow="Setup" title="Classes" sub="Create the classes/arms in your school and assign form teachers." />
      <ClassesManager classes={rows} teachers={teachers} />
    </div>
  );
}
