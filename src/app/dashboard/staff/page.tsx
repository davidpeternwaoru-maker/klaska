import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SectionTitle } from "@/components/ui/primitives";
import { StaffManager, type StaffRow } from "@/components/dashboard/StaffManager";

export default async function StaffPage() {
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
    <div className="mx-auto max-w-[1100px]">
      <SectionTitle eyebrow="People" title="Staff" sub="Add staff and give each one a login. Owners and bursars can manage staff." />
      <StaffManager staff={rows} />
    </div>
  );
}
