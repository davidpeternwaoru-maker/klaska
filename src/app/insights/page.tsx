import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canView } from "@/lib/auth/permissions";
import { getRetentionData } from "@/lib/insights";
import { RetentionPage } from "@/components/insights/RetentionPage";

export default async function Page() {
  const user = await requireUser();
  if (!canView(user.role, "insights")) redirect("/");
  const data = await getRetentionData(user.schoolId);
  return <RetentionPage data={data} />;
}
