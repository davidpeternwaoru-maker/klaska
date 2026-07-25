import { requireAccess } from "@/server/context";
import { staffService } from "@/server/services/staff";
import { teachingService } from "@/server/services/teaching";
import { canManageTeaching } from "@/lib/auth/permissions";
import { SectionTitle } from "@/components/ui/primitives";
import { StaffManager } from "@/components/dashboard/StaffManager";

export default async function Page() {
  const ctx = await requireAccess("staff");
  const canTeach = canManageTeaching(ctx.role);
  const [rows, options] = await Promise.all([
    staffService.list(ctx),
    canTeach ? teachingService.options(ctx) : Promise.resolve({ classes: [], subjects: [] }),
  ]);

  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle eyebrow="People" title="Staff" sub="Your team — logins, roles and teaching duties. Set each teacher's form class and the subjects they teach in each class." />
      <StaffManager staff={rows} canManageTeaching={canTeach} options={options} />
    </div>
  );
}
