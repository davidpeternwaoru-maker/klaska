import { requireAccess } from "@/server/context";
import { studentsService } from "@/server/services/students";
import { RealStudents } from "@/components/people/RealStudents";
import { canManageStudents } from "@/lib/auth/permissions";

export default async function Page() {
  const ctx = await requireAccess("students");
  const [students, classes] = await Promise.all([studentsService.list(ctx), studentsService.classes(ctx)]);

  return <RealStudents students={students} classes={classes} canManage={canManageStudents(ctx.role)} />;
}
