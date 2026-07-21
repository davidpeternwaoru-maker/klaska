import { requireAccess } from "@/server/context";
import { financeService } from "@/server/services/finance";
import { FinancialOS } from "@/components/finance/FinancialOS";

export const metadata = { title: "Financial System · Klaska" };

// The Financial Operating System — everything computed live from records (finance service).
export default async function Page() {
  const user = await requireAccess("financial");
  const v = await financeService.financialView(user);

  return (
    <FinancialOS
      meta={v.meta}
      hero={v.hero}
      months={v.months}
      slices={v.slices}
      monthName={v.monthName}
      levels={v.levels}
      payroll={v.payroll}
      expenses={v.expenses}
      payments={v.payments}
      canEdit={v.canEdit}
    />
  );
}
