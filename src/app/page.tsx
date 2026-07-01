import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { RealOverview } from "@/components/overview/RealOverview";

// The home dashboard is now the real, logged-in app: it loads this school's
// live counts and recent enrolments, and renders them in the polished design.
export default async function Home() {
  const user = await requireUser();
  const where = { schoolId: user.schoolId };
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [school, students, staff, classes, present, recent] = await Promise.all([
    prisma.school.findUnique({ where: { id: user.schoolId }, select: { name: true } }),
    prisma.student.count({ where }),
    prisma.staff.count({ where }),
    prisma.class.count({ where }),
    prisma.attendance.count({ where: { schoolId: user.schoolId, status: "PRESENT", date: startOfToday } }),
    prisma.student.findMany({ where, orderBy: { createdAt: "desc" }, take: 6, include: { class: true } }),
  ]);

  return (
    <RealOverview
      schoolName={school?.name || "Your school"}
      userName={user.name}
      counts={{ students, staff, classes, present }}
      recent={recent.map((s) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        admissionNo: s.admissionNo,
        className: s.class ? (s.class.arm ? `${s.class.name} ${s.class.arm}` : s.class.name) : null,
      }))}
    />
  );
}
