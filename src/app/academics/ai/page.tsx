import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canView } from "@/lib/auth/permissions";
import { buildAIOutcomes } from "@/lib/ai-real";
import { SectionTitle } from "@/components/ui/primitives";
import { AIOutcomesView } from "@/components/academics/AIOutcomesView";

export const metadata = { title: "AI Outcomes Engine · Klaska" };

// The AI Outcomes Engine on the school's REAL data: risk levels from scores +
// attendance, exam-class readiness, and concrete intervention suggestions.
// Teachers see their own classes only (classScope inside the builder).
export default async function Page() {
  const user = await requireUser();
  if (!canView(user.role, "ai")) redirect("/");

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
