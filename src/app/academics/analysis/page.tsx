import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCtx } from "@/server/context";
import { canView } from "@/lib/auth/permissions";
import { analysisService } from "@/server/services/academics";
import { SectionTitle } from "@/components/ui/primitives";
import { AnalysisView } from "@/components/academics/AnalysisView";

export const metadata = { title: "Report Analysis · Klaska" };

export default async function Page() {
  const user = await requireCtx();
  if (!canView(user.role, "results")) redirect("/");

  const { a, meta } = await analysisService.view(user);

  return (
    <div className="mx-auto max-w-[1200px]">
      <SectionTitle
        eyebrow="Academics"
        title="Report Analysis"
        sub="Class-by-class performance from your saved scores — averages, leaders, weak spots, and exportable broadsheets."
        right={
          <Link href="/academics/report-cards" className="inline-flex items-center gap-1.5 rounded-[10px] border border-border px-3.5 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-secondary">
            Report cards
          </Link>
        }
      />
      <AnalysisView a={a} meta={meta} />
    </div>
  );
}
