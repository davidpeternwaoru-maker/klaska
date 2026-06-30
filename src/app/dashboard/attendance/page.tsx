import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { AttendanceControls } from "@/components/dashboard/AttendanceControls";
import { AttendanceMarker } from "@/components/dashboard/AttendanceMarker";

// In Next's App Router, search params arrive as a promise. Driving the class +
// date through the URL means this Server Component re-runs and re-loads the
// right students/marks whenever the user changes either one.
export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; date?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const date = sp.date || today;

  const classes = await prisma.class.findMany({
    where: { schoolId: user.schoolId },
    orderBy: [{ name: "asc" }, { arm: "asc" }],
  });
  const classId = sp.classId || classes[0]?.id || "";
  const classOptions = classes.map((c) => ({ value: c.id, label: c.arm ? `${c.name} ${c.arm}` : c.name }));

  let students: { id: string; name: string }[] = [];
  let existing: Record<string, string> = {};
  if (classId) {
    const list = await prisma.student.findMany({
      where: { schoolId: user.schoolId, classId },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
    students = list.map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}` }));
    const marks = await prisma.attendance.findMany({ where: { schoolId: user.schoolId, classId, date: new Date(date) } });
    existing = Object.fromEntries(marks.map((m) => [m.studentId, m.status]));
  }

  return (
    <div className="mx-auto max-w-[1000px]">
      <SectionTitle eyebrow="People" title="Attendance" sub="Pick a class and a day, mark each pupil, and save. Re-opening a day shows what you already saved." />

      {classes.length === 0 ? (
        <Card className="text-center text-[13px] text-ink-4">Create a class and add students first, then come back to mark attendance.</Card>
      ) : (
        <>
          <AttendanceControls classes={classOptions} classId={classId} date={date} />
          {students.length > 0 ? (
            <AttendanceMarker key={`${classId}:${date}`} classId={classId} date={date} students={students} existing={existing} />
          ) : (
            <Card className="mt-5 text-center text-[13px] text-ink-4">No students in this class yet.</Card>
          )}
        </>
      )}
    </div>
  );
}
