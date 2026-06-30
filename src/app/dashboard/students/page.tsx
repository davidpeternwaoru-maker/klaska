import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SectionTitle } from "@/components/ui/primitives";
import { StudentsManager, type StudentRow, type ClassOption } from "@/components/dashboard/StudentsManager";

function classLabel(c: { name: string; arm: string | null }) {
  return c.arm ? `${c.name} ${c.arm}` : c.name;
}

export default async function StudentsPage() {
  const user = await requireUser();
  const [students, classes] = await Promise.all([
    prisma.student.findMany({ where: { schoolId: user.schoolId }, include: { class: true }, orderBy: { createdAt: "desc" } }),
    prisma.class.findMany({ where: { schoolId: user.schoolId }, orderBy: [{ name: "asc" }, { arm: "asc" }] }),
  ]);

  const rows: StudentRow[] = students.map((s) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    admissionNo: s.admissionNo,
    gender: s.gender,
    dob: s.dob ? s.dob.toISOString().slice(0, 10) : null,
    guardianName: s.guardianName,
    guardianPhone: s.guardianPhone,
    classId: s.classId,
    className: s.class ? classLabel(s.class) : null,
  }));
  const classOptions: ClassOption[] = classes.map((c) => ({ id: c.id, label: classLabel(c) }));

  return (
    <div className="mx-auto max-w-[1100px]">
      <SectionTitle eyebrow="People" title="Students" sub="Enrol students and assign them to a class. Everything saves to the database." />
      <StudentsManager students={rows} classes={classOptions} />
    </div>
  );
}
