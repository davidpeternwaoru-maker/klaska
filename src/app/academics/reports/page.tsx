import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { ReportAnalysisPage } from "@/components/academics/ReportAnalysisPage";

// Sample analysis showcase. Teachers are scoped to their OWN classes (Matrix),
// so they use the real, scoped analysis instead of this whole-school demo.
export default async function Page() {
  const user = await requireUser();
  if (user.role === "TEACHER") redirect("/academics/analysis");
  if (user.role === "BURSAR" || user.role === "ADMIN") redirect("/");
  return <ReportAnalysisPage />;
}
