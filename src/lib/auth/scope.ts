import "server-only";
import type { SessionUser } from "./jwt";

// Per the Permission Matrix, teachers operate on *their own* classes only.
// Use this as the Prisma `where` for class queries so a teacher's pages —
// attendance, results, students — only ever show classes assigned to them.
export function classScope(user: SessionUser): { schoolId: string; teacherId?: string } {
  if (user.role === "TEACHER") return { schoolId: user.schoolId, teacherId: user.staffId };
  return { schoolId: user.schoolId };
}
