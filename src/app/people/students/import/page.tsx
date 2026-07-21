import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCtx } from "@/server/context";
import { canManageStudents } from "@/lib/auth/permissions";
import { studentsService } from "@/server/services/students";
import { SectionTitle } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { ImportStudents } from "@/components/dashboard/ImportStudents";

export const metadata = { title: "Bulk import · Klaska" };

// Bulk student import — inside the main Klaska shell.
export default async function Page() {
  const user = await requireCtx();
  if (!canManageStudents(user.role)) redirect("/people/students");
  const labels = await studentsService.importClassLabels(user);

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
