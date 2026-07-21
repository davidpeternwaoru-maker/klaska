import { redirect } from "next/navigation";
import { requireCtx } from "@/server/context";
import { canView } from "@/lib/auth/permissions";
import { financeService } from "@/server/services/finance";
import { FeesCollection } from "@/components/finance/FeesCollection";

export const metadata = { title: "Fees collection · Klaska" };

export default async function Page() {
  const user = await requireCtx();
  if (!canView(user.role, "fees")) redirect("/"); // teachers never see money
  const v = await financeService.feesView(user);

  return (
    <FeesCollection
      meta={v.meta}
      rows={v.rows}
      classStats={v.classStats}
      kpis={v.kpis}
      classRange={v.classRange}
      termEndsWeeks={v.termEndsWeeks}
      feeMode={v.feeMode}
      canManage={v.canManage}
    />
  );
}
