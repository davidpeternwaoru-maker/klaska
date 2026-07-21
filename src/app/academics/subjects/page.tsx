import Link from "next/link";
import { requireAccess } from "@/server/context";
import { resultsService } from "@/server/services/results";
import { SectionTitle } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { SubjectsManager } from "@/components/dashboard/SubjectsManager";

export const metadata = { title: "Subjects · Klaska" };

// Subjects manager — inside the main Klaska shell.
export default async function Page() {
  const user = await requireAccess("results");
  const rows = await resultsService.subjects(user);

  return (
    <div className="mx-auto max-w-[1100px]">
      <Link href="/academics/results" className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-4 hover:text-ink">
        <Icon name="chevR" size={14} style={{ transform: "rotate(180deg)" }} /> Back to results
      </Link>
      <SectionTitle eyebrow="Setup" title="Subjects" sub="The subjects your school offers. Scores are entered against these on the Results page." />
      <SubjectsManager subjects={rows} />
    </div>
  );
}
