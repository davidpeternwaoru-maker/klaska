import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { classScope } from "@/lib/auth/scope";
import { canView } from "@/lib/auth/permissions";
import { buildClassCards } from "@/lib/reportcard";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { ReportCardsBrowser } from "@/components/academics/ReportCardsBrowser";
import { detectTerm, TERM_LABEL, fmtShortDate, type TermKey } from "@/lib/terms";

export const metadata = { title: "Report Cards · Klaska" };

// Real report cards, generated from the school's own results (Flow 3).
export default async function Page({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const user = await requireUser();
  if (!canView(user.role, "results")) redirect("/");
  const sp = await searchParams;

  const classes = await prisma.class.findMany({ where: classScope(user), orderBy: [{ name: "asc" }, { arm: "asc" }] });
  const classId = sp.classId && classes.some((c) => c.id === sp.classId) ? sp.classId : classes[0]?.id ?? "";
  const classOptions = classes.map((c) => ({ value: c.id, label: c.arm ? `${c.name} ${c.arm}` : c.name }));

  if (!classId) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <SectionTitle eyebrow="Academics" title="Report Cards" sub="Printable terminal report sheets from your saved results." />
        <Card className="text-center text-[13px] text-ink-4">Create classes and enter results first.</Card>
      </div>
    );
  }

  const data = await buildClassCards(user, classId);
  if (!data) redirect("/academics/report-cards");
  const { school, klass, bands, cards, numberInClass } = data;

  const fallback = detectTerm();
  const termKey = (school.term as TermKey) || fallback.term;

  return (
    <div className="mx-auto max-w-[1100px]">
      <SectionTitle
        eyebrow="Academics"
        title="Report Cards"
        sub="Every student's printable terminal report — real scores, class averages, positions and your grading key."
        right={
          <Link href="/academics/results" className="inline-flex items-center gap-1.5 rounded-[10px] border border-border px-3.5 py-2 text-[13px] font-medium text-ink-2 transition hover:bg-secondary">
            Enter results
          </Link>
        }
      />
      <ReportCardsBrowser
        classes={classOptions}
        classId={classId}
        school={{
          name: school.name || "Your school",
          logoUrl: school.logoUrl,
          motto: school.motto,
          address: school.address,
          email: school.email,
          session: school.session || fallback.session,
          termLabel: TERM_LABEL[termKey],
          termEnds: school.termEnd ? fmtShortDate(school.termEnd) : null,
        }}
        klassLabel={klass.arm ? `${klass.name} ${klass.arm}` : klass.name}
        cards={cards}
        numberInClass={numberInClass}
        bands={bands}
      />
    </div>
  );
}
