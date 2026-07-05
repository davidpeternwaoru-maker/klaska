import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canView } from "@/lib/auth/permissions";
import { FinancingPage } from "@/components/finance/FinancingPage";

export default async function Page() {
  const user = await requireUser();
  if (!canView(user.role, "financial")) redirect("/");
  return <FinancingPage />;
}
