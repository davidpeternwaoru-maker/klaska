import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCtx } from "@/server/context";
import { canManageStudents } from "@/lib/auth/permissions";
import { studentsService } from "@/server/services/students";
import { SectionTitle } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { StudentsManager } from "@/components/dashboard/StudentsManager";

export const metadata = { title: "Manage students · Klaska" };

// Add / edit / remove students — inside the main Klaska shell.
export default async function Page() {
  const user = await requireCtx();
  if (!canManageStudents(user.role)) redirect("/people/students");
  const { students: rows, classes: classOptions } = await studentsService.manageRows(user);

  return (
    <div className="mx-auto max-w-[1100px]">
      <Link href="/people/students" className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-4 hover:text-ink">
        <Icon name="chevR" size={14} style={{ transform: "rotate(180deg)" }} /> Back to students
      </Link>
      <SectionTitle
        eyebrow="Students"
        title="Add & manage students"
        sub="Enrol students one by one, edit records, or remove them."
        right={
          <Link href="/people/students/import" className="inline-flex items-center gap-1.5 rounded-[var(--radius-card)] border border-border px-3.5 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-secondary">
            <Icon name="download" size={15} style={{ transform: "rotate(180deg)" }} /> Import from spreadsheet
          </Link>
        }
      />
      <StudentsManager students={rows} classes={classOptions} />
    </div>
  );
}
