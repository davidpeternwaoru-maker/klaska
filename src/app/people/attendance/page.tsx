import { requireCtx } from "@/server/context";
import { attendanceService } from "@/server/services/attendance";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { AttendanceControls } from "@/components/dashboard/AttendanceControls";
import { AttendanceMarker } from "@/components/dashboard/AttendanceMarker";

// Real attendance in the polished shell: pick a class + day, mark, save.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; date?: string }>;
}) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const date = sp.date || new Date().toISOString().slice(0, 10);
  const { hasClasses, classOptions, classId, students, existing, canMark } = await attendanceService.marker(ctx, { classId: sp.classId, date });

  return (
    <div className="mx-auto max-w-[1100px]">
      <SectionTitle eyebrow="People" title="Attendance" sub="Pick a class and a day, mark each pupil, and save. Reopening a day shows what you already saved." />

      {!hasClasses ? (
        <Card className="text-center text-[13px] text-ink-4">Create classes and add students first, then come back to mark attendance.</Card>
      ) : (
        <>
          <AttendanceControls classes={classOptions} classId={classId} date={date} basePath="/people/attendance" />
          {students.length > 0 ? (
            <AttendanceMarker key={`${classId}:${date}`} classId={classId} date={date} students={students} existing={existing} readOnly={!canMark} />
          ) : (
            <Card className="mt-5 text-center text-[13px] text-ink-4">No students in this class yet.</Card>
          )}
        </>
      )}
    </div>
  );
}
