import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SectionTitle } from "@/components/ui/primitives";
import { StaffManager, type StaffRow } from "@/components/dashboard/StaffManager";

export default async function Page() {
  const user = await requireUser();
  const staff = await prisma.staff.findMany({ where: { schoolId: user.schoolId }, orderBy: { createdAt: "asc" } });
  const rows: StaffRow[] = staff.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    role: s.role,
    title: s.title,
    phone: s.phone,
    isSelf: s.id === user.staffId,
  }));

  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle eyebrow="People" title="Staff" sub="Your team — logins and roles. Add staff and set what each person can do." />
      <StaffManager staff={rows} />
    </div>
  );
}
