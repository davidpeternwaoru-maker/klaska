import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canView } from "@/lib/auth/permissions";
import { buildAIOutcomes } from "@/lib/ai-real";
import { prisma } from "@/lib/db";
import { hasFeature } from "@/lib/tier";
import { Card } from "@/components/ui/primitives";
import Link from "next/link";
import { SectionTitle } from "@/components/ui/primitives";
import { AIOutcomesView } from "@/components/academics/AIOutcomesView";

export const metadata = { title: "AI Outcomes Engine · Klaska" };

// The AI Outcomes Engine on the school's REAL data: risk levels from scores +
// attendance, exam-class readiness, and concrete intervention suggestions.
// Teachers see their own classes only (classScope inside the builder).
export default async function Page() {
  const user = await requireUser();
  if (!canView(user.role, "ai")) redirect("/");

  const school = await prisma.school.findUnique({ where: { id: user.schoolId }, select: { tier: true } });
  // Tiering: the AI engine is an Enterprise module (feature flag).
  if (!hasFeature(school?.tier, "aiEngine")) {
    return (
      <div className="mx-auto max-w-[760px]">
        <SectionTitle eyebrow="Academics" title="AI Outcomes Engine" sub="Predictions, risk flags and intervention suggestions from your real scores and attendance." />
        <Card className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] bg-forest-soft text-forest">✨</div>
          <div className="mt-3 text-[16px] font-semibold text-ink">An Enterprise feature</div>
          <p className="mx-auto mt-1 max-w-[440px] text-[13px] text-ink-3">The AI Outcomes Engine — exam readiness, at-risk flags and intervention plans — is part of the Enterprise plan, alongside multi-department analysis and cross-term insights.</p>
          {user.role === "OWNER" ? (
            <Link href="/settings" className="mt-4 inline-flex items-center gap-1.5 rounded-[10px] bg-forest px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-forest-2">Switch plan in Settings →</Link>
          ) : (
            <p className="mt-4 text-[12.5px] text-ink-4">Ask your school owner to upgrade the plan.</p>
          )}
        </Card>
      </div>
    );
  }

  const a = await buildAIOutcomes(user);

  return (
    <div className="mx-auto max-w-[1200px]">
      <SectionTitle
        eyebrow="Academics"
        title="AI Outcomes Engine"
        sub="Who is on track, who needs help before it's too late — computed from your real scores and attendance."
      />
      <AIOutcomesView a={a} />
    </div>
  );
}
