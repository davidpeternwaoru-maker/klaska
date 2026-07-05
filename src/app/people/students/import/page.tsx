import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canManageStudents } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { SectionTitle } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { ImportStudents } from "@/components/dashboard/ImportStudents";

export const metadata = { title: "Bulk import · Klaska" };

// Bulk student import — inside the main Klaska shell.
export default async function Page() {
  const user = await requireUser();
  if (!canManageStudents(user.role)) redirect("/people/students");
  const classes = await prisma.class.findMany({ where: { schoolId: user.schoolId } });
  const labels = classes.flatMap((c) => [c.arm ? `${c.name} ${c.arm}` : c.name, c.name]);

  return (
    <div className="mx-auto max-w-[1100px]">
      <Link href="/people/students" className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-4 hover:text-ink">
        <Icon name="chevR" size={14} style={{ transform: "rotate(180deg)" }} /> Back to students
      </Link>
      <SectionTitle eyebrow="Students" title="Bulk import" sub="Add your whole student list at once from an .xlsx or .csv file." />
      <ImportStudents existingClasses={labels} />
    </div>
  );
}
