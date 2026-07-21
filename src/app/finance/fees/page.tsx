import { requireAccess } from "@/server/context";
import { financeService } from "@/server/services/finance";
import { FeesCollection } from "@/components/finance/FeesCollection";

export const metadata = { title: "Fees collection · Klaska" };

export default async function Page() {
  const user = await requireAccess("fees"); // teachers never see money
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
