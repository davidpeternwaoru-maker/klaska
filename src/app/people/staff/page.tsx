import { requireCtx } from "@/server/context";
import { staffService } from "@/server/services/staff";
import { SectionTitle } from "@/components/ui/primitives";
import { StaffManager } from "@/components/dashboard/StaffManager";

export default async function Page() {
  const ctx = await requireCtx();
  const rows = await staffService.list(ctx);

  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle eyebrow="People" title="Staff" sub="Your team — logins and roles. Add staff and set what each person can do." />
      <StaffManager staff={rows} />
    </div>
  );
}
