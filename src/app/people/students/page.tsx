import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { RealStudents } from "@/components/people/RealStudents";
import { canManageStudents } from "@/lib/auth/permissions";
import { classScope } from "@/lib/auth/scope";

export default async function Page() {
  const user = await requireUser();
  const [students, classes] = await Promise.all([
    prisma.student.findMany({ where: user.role === "TEACHER" ? { schoolId: user.schoolId, class: { teacherId: user.staffId } } : { schoolId: user.schoolId }, include: { class: true }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
    prisma.class.findMany({ where: classScope(user), orderBy: [{ name: "asc" }, { arm: "asc" }] }),
  ]);

  return (
    <RealStudents
      students={students.map((s) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        admissionNo: s.admissionNo,
        gender: s.gender,
        classId: s.classId,
        className: s.class ? (s.class.arm ? `${s.class.name} ${s.class.arm}` : s.class.name) : null,
      }))}
      classes={classes.map((c) => ({ id: c.id, label: c.arm ? `${c.name} ${c.arm}` : c.name }))}
      canManage={canManageStudents(user.role)}
    />
  );
}
