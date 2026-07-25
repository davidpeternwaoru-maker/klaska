import Link from "next/link";
import { requireAccess } from "@/server/context";
import { getDrilldownData } from "@/server/services/analysis-drill";
import { SectionTitle } from "@/components/ui/primitives";
import { AnalysisDrilldown } from "@/components/academics/AnalysisDrilldown";

export const metadata = { title: "Report Analysis · Klaska" };

export default async function Page() {
  const user = await requireAccess("results");
  const data = await getDrilldownData(user);

  return (
    <div className="mx-auto max-w-[1200px]">
      <SectionTitle
        eyebrow="Academics"
        title="Report Analysis"
        sub="Drill from the whole school down to a single subject — best students, best per subject and department, most improved, and weak spots at every level. Export any view."
        right={
          <Link href="/academics/report-cards" className="inline-flex items-center gap-1.5 rounded-[var(--radius-card)] border border-border px-3.5 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-secondary">
            Report cards
          </Link>
        }
      />
      <AnalysisDrilldown data={data} />
    </div>
  );
}
