import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canView } from "@/lib/auth/permissions";
import { getPromotionsData } from "@/lib/promotions";
import { PromotionsPage } from "@/components/people/PromotionsPage";

// Promotions: Owner/HOS run them; Admin views; others don't see this at all.
export default async function Page() {
  const user = await requireUser();
  if (!canView(user.role, "promotions")) redirect("/");
  const data = await getPromotionsData(user);
  return <PromotionsPage data={data} />;
}
