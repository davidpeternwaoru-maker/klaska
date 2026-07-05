import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { canView } from "@/lib/auth/permissions";
import { buildSchoolAnalysis } from "@/lib/analysis";
import { SectionTitle } from "@/components/ui/primitives";
import { AnalysisView } from "@/components/academics/AnalysisView";
import { detectTerm, TERM_LABEL, type TermKey } from "@/lib/terms";

export const metadata = { title: "Report Analysis · Klaska" };

export default async function Page() {
  const user = await requireUser();
  if (!canView(user.role, "results")) redirect("/");

  const [a, school] = await Promise.all([
    buildSchoolAnalysis(user),
    prisma.school.findUnique({ where: { id: user.schoolId }, select: { name: true, session: true, term: true } }),
  ]);
  const fallback = detectTerm();
  const termKey = (school?.term as TermKey) || fallback.term;

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
      <AnalysisView
        a={a}
        meta={{ school: school?.name || "Your school", session: school?.session || fallback.session, termLabel: TERM_LABEL[termKey] }}
      />
    </div>
  );
}
