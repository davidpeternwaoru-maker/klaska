import { requireAccess } from "@/server/context";
import { getRetentionData } from "@/server/services/insights";
import { RetentionPage } from "@/components/insights/RetentionPage";

export default async function Page() {
  const user = await requireAccess("insights");
  const data = await getRetentionData(user.schoolId);
  return <RetentionPage data={data} />;
}
