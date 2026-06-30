import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { ResultsControls } from "@/components/dashboard/ResultsControls";
import { ResultsGrid, type ExistingResult } from "@/components/dashboard/ResultsGrid";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; subjectId?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const [classes, subjects] = await Promise.all([
    prisma.class.findMany({ where: { schoolId: user.schoolId }, orderBy: [{ name: "asc" }, { arm: "asc" }] }),
    prisma.subject.findMany({ where: { schoolId: user.schoolId }, orderBy: { name: "asc" } }),
  ]);
  const classId = sp.classId || classes[0]?.id || "";
  const subjectId = sp.subjectId || subjects[0]?.id || "";
  const classOptions = classes.map((c) => ({ value: c.id, label: c.arm ? `${c.name} ${c.arm}` : c.name }));
  const subjectOptions = subjects.map((s) => ({ value: s.id, label: s.name }));

  let students: { id: string; name: string }[] = [];
  let existing: Record<string, ExistingResult> = {};
  if (classId && subjectId) {
    const list = await prisma.student.findMany({
      where: { schoolId: user.schoolId, classId },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
    students = list.map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}` }));
    const rows = await prisma.result.findMany({
      where: { schoolId: user.schoolId, subjectId, studentId: { in: students.map((s) => s.id) } },
    });
    existing = Object.fromEntries(rows.map((r) => [r.studentId, { ca1: r.ca1, ca2: r.ca2, exam: r.exam, total: r.total, grade: r.grade }]));
  }

  return (
    <div className="mx-auto max-w-[1000px]">
      <SectionTitle
        eyebrow="Academics"
        title="Results"
        sub="Enter CA1, CA2 and Exam per student. Total and grade are worked out automatically."
        right={
          <Link href="/dashboard/subjects" className="inline-flex items-center gap-1.5 rounded-[10px] border border-border px-3.5 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-secondary">
            Manage subjects
          </Link>
        }
      />

      {classes.length === 0 ? (
        <Card className="text-center text-[13px] text-ink-4">Create a class and add students first.</Card>
      ) : subjects.length === 0 ? (
        <Card className="text-center text-[13px] text-ink-4">
          No subjects yet.{" "}
          <Link href="/dashboard/subjects" className="font-medium text-forest hover:underline">Add subjects</Link> to start entering results.
        </Card>
      ) : (
        <>
          <ResultsControls classes={classOptions} subjects={subjectOptions} classId={classId} subjectId={subjectId} />
          {students.length > 0 ? (
            <ResultsGrid key={`${classId}:${subjectId}`} classId={classId} subjectId={subjectId} students={students} existing={existing} />
          ) : (
            <Card className="mt-5 text-center text-[13px] text-ink-4">No students in this class yet.</Card>
          )}
        </>
      )}
    </div>
  );
}
