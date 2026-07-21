import Link from "next/link";
import { requireAccess } from "@/server/context";
import { resultsService } from "@/server/services/results";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { ResultsControls } from "@/components/dashboard/ResultsControls";
import { ResultsGrid } from "@/components/dashboard/ResultsGrid";

// Real results entry in the polished shell: class + subject → CA1/CA2/Exam,
// totals and grades computed automatically, saved per student.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; subjectId?: string }>;
}) {
  const user = await requireAccess("results");
  const sp = await searchParams;

  const { hasClasses, hasSubjects, classOptions, subjectOptions, classId, subjectId, students, existing, canEnter } = await resultsService.grid(user, {
    classId: sp.classId,
    subjectId: sp.subjectId,
  });

  return (
    <div className="mx-auto max-w-[1100px]">
      <SectionTitle
        eyebrow="Academics"
        title="Results"
        sub="Enter CA1, CA2 and Exam per student — totals and grades are worked out automatically."
        right={
          <>
            <Link href="/academics/subjects" className="inline-flex items-center gap-1.5 rounded-[var(--radius-card)] border border-border px-3.5 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-secondary">
              Manage subjects
            </Link>
            <Link href="/academics/report-cards" className="inline-flex items-center gap-1.5 rounded-[var(--radius-card)] bg-forest px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-forest-2">
              View report cards
            </Link>
          </>
        }
      />

      {!hasClasses ? (
        <Card className="text-center text-[13px] text-ink-4">Create classes and add students first.</Card>
      ) : !hasSubjects ? (
        <Card className="text-center text-[13px] text-ink-4">
          No subjects yet.{" "}
          <Link href="/academics/subjects" className="font-medium text-forest hover:underline">Add subjects</Link> to start entering results.
        </Card>
      ) : (
        <>
          <ResultsControls classes={classOptions} subjects={subjectOptions} classId={classId} subjectId={subjectId} basePath="/academics/results" />
          {students.length > 0 ? (
            <ResultsGrid key={`${classId}:${subjectId}`} classId={classId} subjectId={subjectId} students={students} existing={existing} readOnly={!canEnter} />
          ) : (
            <Card className="mt-5 text-center text-[13px] text-ink-4">No students in this class yet.</Card>
          )}
        </>
      )}
    </div>
  );
}
