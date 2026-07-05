import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canView } from "@/lib/auth/permissions";
import { RetentionPage } from "@/components/insights/RetentionPage";

export default async function Page() {
  const user = await requireUser();
  if (!canView(user.role, "insights")) redirect("/");
  return <RetentionPage />;
}
