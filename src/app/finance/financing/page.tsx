import { requireAccess } from "@/server/context";
import { FinancingPage } from "@/components/finance/FinancingPage";

export default async function Page() {
  await requireAccess("financial");
  return <FinancingPage />;
}
