import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SectionTitle } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { ImportStudents } from "@/components/dashboard/ImportStudents";

export default async function ImportStudentsPage() {
  const user = await requireUser();
  const classes = await prisma.class.findMany({ where: { schoolId: user.schoolId } });
  // Pass both "Name Arm" and "Name" so the sheet can match either form.
  const labels = classes.flatMap((c) => [c.arm ? `${c.name} ${c.arm}` : c.name, c.name]);

  return (
    <div className="mx-auto max-w-[1100px]">
      <Link href="/dashboard/students" className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-4 hover:text-ink">
        <Icon name="chevR" size={14} style={{ transform: "rotate(180deg)" }} /> Back to students
      </Link>
      <SectionTitle eyebrow="Students" title="Bulk import" sub="Add your whole student list at once from an .xlsx or .csv file." />
      <ImportStudents existingClasses={labels} />
    </div>
  );
}
