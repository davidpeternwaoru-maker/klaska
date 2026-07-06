import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canView } from "@/lib/auth/permissions";
import { Card, Pill, SectionTitle } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { AppraisalsPage } from "@/components/people/AppraisalsPage";

export const metadata = { title: "Appraisals · Klaska" };

// Matrix: Owner ALL · HOS ALL · HOD Dept · Teacher OWN ONLY · Bursar/Admin —.
export default async function Page() {
  const user = await requireUser();
  if (!canView(user.role, "appraisals")) redirect("/");

  // Teachers see only their own appraisal — never the whole board.
  if (user.role === "TEACHER") {
    return (
      <div className="mx-auto max-w-[760px]">
        <SectionTitle eyebrow="People" title="My appraisal" sub="Your own performance appraisal — only you, your head of department and school leadership can see it." />
        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-forest-soft text-forest">
              <Icon name="target" size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14.5px] font-semibold text-ink">{user.name}</div>
              <div className="text-[12.5px] text-ink-4">This term&apos;s appraisal cycle</div>
            </div>
            <Pill tone="neutral">Not started</Pill>
          </div>
          <div className="mt-4 rounded-[12px] bg-secondary p-4 text-[13px] leading-relaxed text-ink-3">
            No appraisal has been recorded for you this cycle yet. When your school runs its appraisal round, you&apos;ll complete your
            <b className="text-ink-2"> self-appraisal here</b>, and see your head of department&apos;s and principal&apos;s reviews of you — and only yours.
          </div>
        </Card>
      </div>
    );
  }

  // Owner / HOS / HOD get the full appraisal board (sample cycle for now).
  return <AppraisalsPage />;
}
