import { requireAccess } from "@/server/context";
import { canManage } from "@/lib/auth/permissions";
import { Card, Pill, SectionTitle } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { AppraisalsPage } from "@/components/people/AppraisalsPage";
import { getAppraisalsBoard, getOwnAppraisal } from "@/lib/appraisals";
import { STATUS_META } from "@/lib/appraisals/config";

export const metadata = { title: "Appraisals · Klaska" };

// Matrix: Owner ALL · HOS ALL · HOD teaching staff · Teacher OWN ONLY · Bursar/Admin —.
export default async function Page() {
  const user = await requireAccess("appraisals");

  // Teachers see only their own appraisal — never the whole board.
  if (user.role === "TEACHER") {
    const { appraisal: a } = await getOwnAppraisal(user);
    const st = STATUS_META[a.status];
    return (
      <div className="mx-auto max-w-[760px]">
        <SectionTitle eyebrow="People" title="My appraisal" sub="Your own performance appraisal — only you, your head of department and school leadership can see it." />
        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-card)] bg-forest-soft text-forest">
              <Icon name="target" size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14.5px] font-semibold text-ink">{user.name}</div>
              <div className="text-[12.5px] text-ink-4">This term&apos;s appraisal cycle</div>
            </div>
            {a.overall != null && a.band ? <Pill tone={a.band.tone}>{a.overall.toFixed(2)} · {a.band.label}</Pill> : <Pill tone={st.tone}>{st.label}</Pill>}
          </div>
          <div className="mt-4 rounded-[var(--radius-card)] bg-secondary p-4 text-[13px] leading-relaxed text-ink-3">
            {a.overall != null ? (
              <>
                Your current appraisal stands at <b className="text-ink">{a.overall.toFixed(2)} / 5.0</b> ({a.band?.label}). Your head of department and principal
                contribute to this; once it&apos;s formally signed off the full breakdown is shared with you.
              </>
            ) : (
              <>
                No appraisal has been recorded for you this cycle yet. When your school runs its appraisal round, your
                <b className="text-ink-2"> self-appraisal, your head of department&apos;s and the principal&apos;s reviews</b> will appear here — and only yours.
              </>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // Owner / HOS / HOD get the appraisal board.
  const { board, meta } = await getAppraisalsBoard(user);
  return <AppraisalsPage board={board} meta={meta} canSignoff={canManage(user.role, "appraisals")} />;
}
