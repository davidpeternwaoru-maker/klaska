import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SectionTitle } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { StudentsManager, type StudentRow, type ClassOption } from "@/components/dashboard/StudentsManager";

export const metadata = { title: "Manage students · Klaska" };

function classLabel(c: { name: string; arm: string | null }) {
  return c.arm ? `${c.name} ${c.arm}` : c.name;
}

// Add / edit / remove students — inside the main Klaska shell.
export default async function Page() {
  const user = await requireUser();
  const [students, classes] = await Promise.all([
    prisma.student.findMany({ where: { schoolId: user.schoolId }, include: { class: true }, orderBy: { createdAt: "desc" } }),
    prisma.class.findMany({ where: { schoolId: user.schoolId }, orderBy: [{ name: "asc" }, { arm: "asc" }] }),
  ]);

  const rows: StudentRow[] = students.map((s) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    admissionNo: s.admissionNo,
    gender: s.gender,
    dob: s.dob ? s.dob.toISOString().slice(0, 10) : null,
    guardianName: s.guardianName,
    guardianPhone: s.guardianPhone,
    classId: s.classId,
    className: s.class ? classLabel(s.class) : null,
  }));
  const classOptions: ClassOption[] = classes.map((c) => ({ id: c.id, label: classLabel(c) }));

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
          <Link href="/people/students/import" className="inline-flex items-center gap-1.5 rounded-[10px] border border-border px-3.5 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-secondary">
            <Icon name="download" size={15} style={{ transform: "rotate(180deg)" }} /> Import from spreadsheet
          </Link>
        }
      />
      <StudentsManager students={rows} classes={classOptions} />
    </div>
  );
}
