"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, SectionTitle, Pill, Button, SegTabs } from "@/components/ui/primitives";
import { KPI } from "@/components/ui/KPI";
import { Avatar } from "@/components/ui/Avatar";
import { Icon, KLogo } from "@/components/ui/Icon";
import { ROLE_LABEL } from "@/lib/auth/permissions";
import type { Role } from "@/lib/auth/jwt";
import {
  COMPETENCIES,
  RATERS,
  RATER_LABEL,
  progressLine,
  type Appraisal,
  type RaterEntry,
  type RaterId,
  type Tone,
} from "@/lib/appraisals/config";
import type { AppraisalMeta } from "@/server/services/appraisals-read";
import { saveRatingAction } from "@/lib/actions/appraisals";
import { exportExcel, exportPdf } from "@/lib/export/engine";
import { appraisalsReport } from "@/lib/export/reports";

const roleName = (r: string) => ROLE_LABEL[r as Role] ?? r;
const toneVar = (t: Tone) => (t === "green" ? "var(--color-forest)" : t === "amber" ? "var(--color-amber, #b7791f)" : "var(--color-red, #c0392b)");
function scoreTone(v: number | null): Tone | null {
  if (v == null) return null;
  return v >= 3.5 ? "green" : v >= 2.5 ? "amber" : "red";
}

type Props = {
  viewerRole: Role;
  viewerStaffId: string;
  board: Appraisal[];
  own: Appraisal | null;
  meta: AppraisalMeta;
  viewerDepartment: string | null;
};

export function AppraisalWorkspace({ viewerRole, board, own, meta, viewerDepartment }: Props) {
  const isTeacher = viewerRole === "TEACHER";
  const isHOD = viewerRole === "HOD";
  const isLeader = viewerRole === "HOS" || viewerRole === "OWNER";

  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState(isHOD ? "dept" : "roster");
  const open = openId ? board.find((a) => a.staff.id === openId) ?? null : null;

  // ── Teacher: only their own appraisal, with a self-appraisal form ──────────
  if (isTeacher) {
    return (
      <div className="mx-auto max-w-[980px]">
        <SectionTitle eyebrow="People" title="My appraisal" sub="Your own performance appraisal. Only you, your head of department and school leadership can see it — no other teacher can." right={<Pill tone="forest">{meta.cycle}</Pill>} />
        {own && <AppraisalDetail a={own} meta={meta} />}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle
        eyebrow="People"
        title={isHOD ? "Department appraisals" : "Staff Appraisals"}
        sub={isHOD ? `Appraise the teachers in your department${viewerDepartment ? ` · ${viewerDepartment}` : ""}. You can also complete your own self-appraisal.` : "Every teacher, appraised from three perspectives — self, head of department and principal. Compare across the school."}
        right={
          <>
            <Pill tone="forest">{meta.cycle}</Pill>
            {isLeader && <ExportButtons board={board} meta={meta} />}
          </>
        }
      />

      {isHOD ? (
        <>
          <SegTabs value={tab} onChange={setTab} tabs={[{ value: "dept", label: `My department${viewerDepartment ? ` · ${viewerDepartment}` : ""}` }, { value: "mine", label: "My appraisal" }]} />
          <div className="mt-4 k-rise">
            {tab === "dept" && <Overview board={board} onOpen={setOpenId} title={viewerDepartment ? `${viewerDepartment} department` : "My department"} emptyHint="No teachers are assigned to your department yet. Ask your principal to assign them." />}
            {tab === "mine" && own && <AppraisalDetail a={own} meta={meta} />}
          </div>
        </>
      ) : (
        <div className="mt-2 k-rise">
          <Overview board={board} onOpen={setOpenId} title="All teaching staff" emptyHint="No teachers to appraise yet." showKpis />
        </div>
      )}

      {open && <AppraisalSheet a={open} meta={meta} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function ExportButtons({ board, meta }: { board: Appraisal[]; meta: AppraisalMeta }) {
  const [busy, setBusy] = useState<string | null>(null);
  async function run(kind: "xlsx" | "pdf") {
    setBusy(kind);
    try {
      const spec = appraisalsReport({ school: meta.school, term: meta.term, session: meta.session }, board);
      if (kind === "xlsx") await exportExcel(spec);
      else await exportPdf(spec);
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <Button kind="ghost" size="sm" icon="download" onClick={() => run("xlsx")}>{busy === "xlsx" ? "Building…" : "Excel"}</Button>
      <Button kind="ghost" size="sm" icon="reports" onClick={() => run("pdf")}>{busy === "pdf" ? "Building…" : "PDF"}</Button>
    </>
  );
}

// ── School / department overview: KPIs + a ranked roster ──────────────────────
function Overview({ board, onOpen, title, emptyHint, showKpis }: { board: Appraisal[]; onOpen: (id: string) => void; title: string; emptyHint: string; showKpis?: boolean }) {
  const summary = useMemo(() => {
    const scored = board.filter((a) => a.overall != null);
    const avg = scored.length ? Math.round((scored.reduce((t, a) => t + (a.overall ?? 0), 0) / scored.length) * 100) / 100 : 0;
    const complete = board.filter((a) => a.progress.self === "done" && a.progress.hod === "done" && a.progress.hos === "done").length;
    const top = [...scored].sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0))[0] ?? null;
    const low = [...scored].sort((a, b) => (a.overall ?? 0) - (b.overall ?? 0))[0] ?? null;
    return { avg, complete, total: board.length, scored: scored.length, top, low };
  }, [board]);

  const ranked = useMemo(() => [...board].sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1)), [board]);

  return (
    <>
      {showKpis && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KPI label="Teachers" value={String(summary.total)} sub="" icon="students" />
          <KPI label="Fully appraised" value={`${summary.complete}/${summary.total}`} delta="all three done" deltaTone="green" sub="" icon="check" />
          <KPI label="School average" value={summary.avg ? summary.avg.toFixed(2) : "—"} delta="of 5.0" sub="" icon="target" />
          <KPI label="Top performer" value={summary.top ? summary.top.overall!.toFixed(2) : "—"} delta={summary.top?.staff.name.split(" ")[0] ?? ""} deltaTone="green" sub="" icon="trend" />
        </div>
      )}
      <Card pad={0} className="overflow-hidden">
        <div className="flex items-center justify-between p-5">
          <div className="text-body font-semibold text-ink">{title} · {board.length}</div>
          <div className="text-[12px] text-ink-4">Click a teacher to open their appraisal</div>
        </div>
        {board.length === 0 ? (
          <div className="px-5 pb-8 text-center text-[13px] text-ink-4">{emptyHint}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-y border-border text-[11px] uppercase tracking-[0.05em] text-ink-4">
                  <th className="px-5 py-2.5 text-left font-medium">Teacher</th>
                  <th className="px-5 py-2.5 text-left font-medium">Department</th>
                  <th className="px-5 py-2.5 text-left font-medium">Progress</th>
                  <th className="px-5 py-2.5 text-left font-medium">Overall</th>
                  <th className="px-5 py-2.5 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((a) => (
                  <tr key={a.staff.id} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/60">
                    <td className="px-5 py-3">
                      <button onClick={() => onOpen(a.staff.id)} className="flex items-center gap-2.5 text-left">
                        <Avatar name={a.staff.name} hue={a.staff.hue} size={32} />
                        <span>
                          <span className="block font-medium text-ink hover:text-forest">{a.staff.name}</span>
                          <span className="block text-[11.5px] text-ink-4">{roleName(a.staff.role)}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-5 py-3 text-ink-3">{a.staff.department ?? "—"}</td>
                    <td className="px-5 py-3"><Stages a={a} /></td>
                    <td className="px-5 py-3">
                      {a.overall != null && a.band ? (
                        <span className="flex items-center gap-2">
                          <span className="font-semibold text-ink">{a.overall.toFixed(2)}</span>
                          <Pill tone={a.band.tone}>{a.band.label}</Pill>
                        </span>
                      ) : (
                        <span className="text-ink-4">Not started</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right"><Button kind="ghost" size="sm" icon="chevR" onClick={() => onOpen(a.staff.id)}>Open</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function Stages({ a }: { a: Appraisal }) {
  return (
    <span className="flex items-center gap-1.5">
      {RATERS.map((rt) => {
        const p = a.progress[rt.id];
        const done = p === "done";
        const draft = p === "draft";
        return (
          <span key={rt.id} title={`${RATER_LABEL[rt.id]}: ${p}`} className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold"
            style={{ background: done ? "var(--color-forest-soft)" : draft ? "var(--color-amber-soft, #fdf3e0)" : "var(--color-secondary)", color: done ? "var(--color-forest)" : draft ? "var(--color-amber, #b7791f)" : "var(--color-ink-4)" }}>
            {done ? "✓" : RATER_LABEL[rt.id][0]}
          </span>
        );
      })}
    </span>
  );
}

// ── Modal wrapper around the detail view ─────────────────────────────────────
function AppraisalSheet({ a, meta, onClose }: { a: Appraisal; meta: AppraisalMeta; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[1000px]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-end gap-2">
          <Button kind="dark" size="sm" onClick={onClose}>Close</Button>
        </div>
        <AppraisalDetail a={a} meta={meta} />
      </div>
    </div>
  );
}

// ── The full appraisal: header, side-by-side table, comments, + editable form ─
function AppraisalDetail({ a, meta }: { a: Appraisal; meta: AppraisalMeta }) {
  const editable = a.editableRater;
  const editableEntry = editable ? a.entries[editable] : null;
  const locked = !!editableEntry && editableEntry.status === "SUBMITTED";

  return (
    <div className="flex flex-col gap-4">
      <Card pad={0} className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-secondary/40 p-5">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[var(--radius-card)] bg-forest-soft"><KLogo size={28} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Avatar name={a.staff.name} hue={a.staff.hue} size={26} />
              <span className="truncate text-[15px] font-semibold text-ink">{a.staff.name}</span>
            </div>
            <div className="mt-0.5 text-[12px] text-ink-4">{roleName(a.staff.role)}{a.staff.department ? ` · ${a.staff.department}` : ""} · {meta.cycle}</div>
          </div>
          {a.overall != null && a.band ? (
            <div className="flex flex-none flex-col items-center rounded-[var(--radius-card)] border border-border px-4 py-1.5">
              <span className="font-display text-[22px] font-bold text-forest">{a.overall.toFixed(2)}</span>
              <span className="text-[9px] font-semibold uppercase text-ink-4">{a.band.label}</span>
            </div>
          ) : (
            <Pill tone="neutral">Not started</Pill>
          )}
        </div>
        <div className="px-5 py-2.5 text-[12px] text-ink-3">{progressLine(a.progress)}</div>
      </Card>

      {/* Side-by-side scores */}
      <Card pad={0} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-[0.05em] text-ink-4">
                <th className="px-5 py-2.5 text-left font-medium">Criterion</th>
                {RATERS.map((rt) => <th key={rt.id} className="px-4 py-2.5 text-center font-medium">{RATER_LABEL[rt.id]}</th>)}
              </tr>
            </thead>
            <tbody>
              {a.perComp.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-2.5">
                    <span className="block font-medium text-ink">{c.label}</span>
                    <span className="block text-[11px] text-ink-4">{c.hint}</span>
                  </td>
                  {RATERS.map((rt) => {
                    const v = c.scores[rt.id];
                    const t = scoreTone(v);
                    return (
                      <td key={rt.id} className="px-4 py-2.5 text-center">
                        {v != null ? <span className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] text-[12px] font-bold" style={{ background: t === "green" ? "var(--color-forest-soft)" : "var(--color-secondary)", color: toneVar(t!) }}>{v}</span> : <span className="text-ink-4">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-secondary/60 font-semibold">
                <td className="px-5 py-2.5 text-ink">Overall score</td>
                {RATERS.map((rt) => {
                  const e = a.entries[rt.id];
                  return <td key={rt.id} className="px-4 py-2.5 text-center text-forest">{e?.overall != null ? e.overall.toFixed(2) : "—"}</td>;
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Each perspective's comment + status */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {RATERS.map((rt) => {
          const e = a.entries[rt.id];
          return (
            <Card key={rt.id} className="text-[12.5px]">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink">{rt.label}</span>
                {e ? <Pill tone={e.status === "SUBMITTED" ? "green" : "amber"}>{e.status === "SUBMITTED" ? "Submitted" : "Draft"}</Pill> : <Pill tone="neutral">Pending</Pill>}
              </div>
              <div className="mt-1 text-[11px] text-ink-4">{e ? `${e.by} · ${e.date}` : rt.who}</div>
              <p className="mt-2 text-ink-2">{e?.comment ? `“${e.comment}”` : <span className="text-ink-4">No comment yet.</span>}</p>
            </Card>
          );
        })}
      </div>

      {/* Editable form — only when this viewer may fill a perspective */}
      {editable && (locked ? (
        <Card className="border-forest-line bg-forest-soft/30">
          <div className="flex items-center gap-2 text-forest"><Icon name="check" size={17} /><span className="text-[13px] font-semibold">Your {RATER_LABEL[editable]} appraisal is submitted &amp; locked.</span></div>
          <div className="mt-1 text-[12px] text-ink-3">You&apos;ve completed and submitted this portion for this cycle. It can no longer be edited.</div>
        </Card>
      ) : (
        <ReviewForm subjectId={a.staff.id} rater={editable} initial={editableEntry} />
      ))}
    </div>
  );
}

// ── The reviewer's editable form (draft / submit) ────────────────────────────
function ReviewForm({ subjectId, rater, initial }: { subjectId: string; rater: RaterId; initial: RaterEntry | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [scores, setScores] = useState<Record<string, number | null>>(() => Object.fromEntries(COMPETENCIES.map((c) => [c.id, initial?.sections[c.id]?.score ?? null])));
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(COMPETENCIES.map((c) => [c.id, initial?.sections[c.id]?.comment ?? ""])));
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [flash, setFlash] = useState<string | null>(null);

  const rated = COMPETENCIES.filter((c) => scores[c.id] != null);
  const avg = rated.length ? rated.reduce((t, c) => t + (scores[c.id] ?? 0), 0) / rated.length : 0;
  const allRated = rated.length === COMPETENCIES.length;

  function submit(final: boolean) {
    const sections = COMPETENCIES.filter((c) => scores[c.id] != null).map((c) => ({ competency: c.id, score: scores[c.id] as number, comment: notes[c.id] }));
    start(async () => {
      const res = await saveRatingAction(subjectId, rater, sections, comment, final);
      if (res.error) { setFlash(res.error); return; }
      setFlash(final ? "Submitted." : "Draft saved.");
      setTimeout(() => setFlash(null), 2200);
      router.refresh();
    });
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="text-body font-semibold text-ink">Your {RATER_LABEL[rater]} appraisal</div>
        {flash && <span className="inline-flex items-center gap-1 rounded-full bg-forest-soft px-2.5 py-1 text-[12px] font-medium text-forest"><Icon name="check" size={13} /> {flash}</span>}
      </div>
      <div className="mt-1 text-[12px] text-ink-4">Rate each criterion 1–5. Add a note per section if you like, then an overall comment. Save a draft to finish later, or submit to lock it in.</div>

      <div className="mt-4 flex flex-col divide-y divide-border">
        {COMPETENCIES.map((c) => (
          <div key={c.id} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-ink">{c.label}</span>
                <span className="block text-[11px] text-ink-4">{c.hint}</span>
              </span>
              <span className="flex flex-none gap-1">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button key={v} onClick={() => setScores((s) => ({ ...s, [c.id]: v }))} className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[13px] font-semibold transition"
                    style={{ background: scores[c.id] === v ? "var(--color-forest)" : "var(--color-secondary)", color: scores[c.id] === v ? "#fff" : "var(--color-ink-3)" }}>
                    {v}
                  </button>
                ))}
              </span>
            </div>
            <input value={notes[c.id]} onChange={(e) => setNotes((n) => ({ ...n, [c.id]: e.target.value }))} placeholder="Optional note for this criterion…"
              className="mt-2 h-8 w-full rounded-[8px] border border-border px-2.5 text-[12px] outline-none focus:border-forest" />
          </div>
        ))}
      </div>

      <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wide text-ink-4">Overall comment</label>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Summary of this teacher's term — strengths and areas to grow…"
        className="mt-1 w-full rounded-[8px] border border-border p-2.5 text-[12.5px] outline-none focus:border-forest" />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[12.5px] text-ink-4">Overall so far <b className="text-ink">{avg ? avg.toFixed(2) : "—"}</b>{!allRated && <span className="ml-1">· rate all {COMPETENCIES.length} to submit</span>}</span>
        <span className="flex gap-2">
          <Button kind="ghost" size="sm" icon="edit" disabled={pending || rated.length === 0} onClick={() => submit(false)}>{pending ? "Saving…" : "Save draft"}</Button>
          <Button kind="primary" size="sm" icon="check" disabled={pending || !allRated} onClick={() => submit(true)}>{pending ? "Submitting…" : "Submit & lock"}</Button>
        </span>
      </div>
    </Card>
  );
}
