import { requireAccess } from "@/server/context";
import { getPromotionsData } from "@/server/services/promotions";
import { PromotionsPage } from "@/components/people/PromotionsPage";

// Promotions: Owner/HOS run them; Admin views; others don't see this at all.
export default async function Page() {
  const user = await requireAccess("promotions");
  const data = await getPromotionsData(user);
  return <PromotionsPage data={data} />;
}
