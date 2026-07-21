"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, SectionTitle, Pill, Button } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import type { PromotionsData, PromoClass } from "@/lib/promotions";
import { promoteClassAction, promoteStudentsAction, runEndOfSessionAction } from "@/lib/actions/promotions";

type Mode = "promote" | "hold" | "repeat";

export function PromotionsPage({ data: d }: { data: PromotionsData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [modes, setModes] = useState<Record<string, Mode>>({});
  const [review, setReview] = useState<PromoClass | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const modeOf = (classId: string): Mode => modes[classId] ?? "promote";
  const done = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2600);
    router.refresh();
  };

  function applyClass(c: PromoClass, mode: Mode) {
    if (mode === "hold") return;
    if (typeof window !== "undefined" && !window.confirm(`${mode === "repeat" ? "Repeat" : c.next === "Graduated" ? "Graduate" : "Promote"} all ${c.count} students in ${c.klass}?`)) return;
    start(async () => {
      const r = await promoteClassAction(c.classId, mode === "repeat" ? "repeat" : "promote");
      done(r.error ? r.error : `${c.klass}: ${r.count} student${r.count === 1 ? "" : "s"} ${mode === "repeat" ? "held back" : c.next === "Graduated" ? "graduated" : "promoted"}.`);
    });
  }

  function runEndOfSession() {
    if (typeof window !== "undefined" && !window.confirm(`Run end-of-session for all ${d.totalActive} students? Each advances one class; the SSS 3 cohort graduates.`)) return;
    const modeMap: Record<string, "promote" | "repeat"> = {};
    d.classes.forEach((c) => (modeMap[c.classId] = modeOf(c.classId) === "repeat" ? "repeat" : "promote"));
    start(async () => {
      const r = await runEndOfSessionAction(modeMap);
      done(r.error ? r.error : `End-of-session complete — ${r.count} students processed.`);
    });
  }

  function exportPlan() {
    const rows = [["Class", "Teacher", "Students", "Class avg %", "At risk", "Advances to"]];
    d.classes.forEach((c) => rows.push([c.klass, c.teacher, String(c.count), String(c.avg), String(c.atRisk), c.next]));
    const csv = rows.map((r) => r.map((x) => (/[",\n]/.test(x) ? `"${x}"` : x)).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "klaska-promotion-plan.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle
        eyebrow="Class Progression"
        title="End-of-session promotions"
        sub="Promote students up the ladder. Every promotion is recorded in the student's history and moves them into the next class."
        right={
          <>
            {flash && <span className="hidden items-center gap-1 rounded-full bg-forest-soft px-2.5 py-1 text-[12px] font-medium text-forest sm:inline-flex"><Icon name="check" size={13} /> {flash}</span>}
            <Button kind="ghost" size="sm" icon="download" onClick={exportPlan} disabled={pending}>
              Export plan
            </Button>
            <Button kind="primary" size="sm" icon="sparkle" onClick={runEndOfSession} disabled={pending}>
              {pending ? "Working…" : "Run end-of-session"}
            </Button>
          </>
        }
      />

      {/* banner */}
      <Card className="mb-5 flex flex-wrap items-center gap-4">
        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[14px] bg-forest text-white">
          <Icon name="arrowU" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-ink">End of {d.session} session</div>
          <div className="text-[12.5px] text-ink-4">
            Eligible students move up one class; the SSS 3 cohort graduates to alumni. Repeated students stay in their current class — all recorded in history.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="green"><Icon name="check" size={12} /> {d.eligible} eligible</Pill>
          <Pill tone="amber"><Icon name="clock" size={12} /> {d.toReview} to review</Pill>
          <Pill tone="blue"><Icon name="badge" size={12} /> {d.graduating} graduating</Pill>
        </div>
      </Card>

      {d.classes.length === 0 ? (
        <Card className="text-center">
          <p className="py-6 text-[13px] text-ink-4">No active classes to promote yet.</p>
        </Card>
      ) : (
        <div className="k-stagger grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {d.classes.map((c) => {
            const mode = modeOf(c.classId);
            const grad = c.next === "Graduated";
            return (
              <Card key={c.classId} pad={20}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-display text-[16px] font-semibold text-ink">{c.klass}</div>
                    <div className="truncate text-[12.5px] text-ink-4">{c.teacher}</div>
                  </div>
                  <ModeSegment value={mode} onChange={(m) => setModes((p) => ({ ...p, [c.classId]: m }))} />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Stat label="Students" value={String(c.count)} />
                  <Stat label="Class avg" value={`${c.avg}%`} tone="forest" />
                  <Stat label="At risk" value={String(c.atRisk)} tone={c.atRisk ? "red" : undefined} />
                </div>

                <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-forest" style={{ width: `${(c.eligible / c.count) * 100}%` }} />
                </div>
                <div className="mt-2 text-[12px] text-ink-4">
                  <b className="text-ink">{c.eligible}</b> eligible to {grad ? "graduate" : "advance"} · <b className="text-ink">{c.atRisk}</b> flagged for review
                </div>

                <div className="mt-4 flex gap-2">
                  <Button kind="ghost" size="sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => setReview(c)} disabled={pending}>
                    Review students
                  </Button>
                  <Button kind="primary" size="sm" style={{ flex: 1, justifyContent: "center" }} icon={mode === "repeat" ? "minus" : grad ? "badge" : "arrowU"} onClick={() => applyClass(c, mode)} disabled={pending}>
                    {mode === "repeat" ? "Repeat class" : grad ? "Graduate class" : "Promote class"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {review && <ReviewModal cls={review} pending={pending} onClose={() => setReview(null)} onApply={(items) => start(async () => { const r = await promoteStudentsAction(items); done(r.error ? r.error : `${review.klass}: ${r.count} students updated.`); setReview(null); })} />}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "forest" | "red" }) {
  const color = tone === "forest" ? "var(--color-forest)" : tone === "red" ? "var(--color-red)" : "var(--color-ink)";
  return (
    <div>
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-4">{label}</div>
      <div className="mt-0.5 font-display text-[20px] font-bold tracking-[-0.02em]" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function ModeSegment({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) {
  const opts: { v: Mode; icon: "arrowU" | "arrowR" | "minus"; title: string }[] = [
    { v: "promote", icon: "arrowU", title: "Promote up" },
    { v: "hold", icon: "arrowR", title: "Hold for review" },
    { v: "repeat", icon: "minus", title: "Repeat class" },
  ];
  return (
    <div className="flex flex-none gap-0.5 rounded-[9px] bg-forest-soft p-0.5">
      {opts.map((o) => (
        <button
          key={o.v}
          title={o.title}
          onClick={() => onChange(o.v)}
          className="flex h-7 w-7 items-center justify-center rounded-[7px] transition"
          style={value === o.v ? { background: "var(--color-forest)", color: "#fff" } : { color: "var(--color-forest)" }}
        >
          <Icon name={o.icon} size={14} />
        </button>
      ))}
    </div>
  );
}

function ReviewModal({ cls, pending, onClose, onApply }: { cls: PromoClass; pending: boolean; onClose: () => void; onApply: (items: { studentId: string; mode: "promote" | "repeat" }[]) => void }) {
  const [choice, setChoice] = useState<Record<string, "promote" | "repeat">>({});
  const choiceOf = (id: string) => choice[id] ?? "promote";
  const grad = cls.next === "Graduated";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[86vh] w-full max-w-[620px] flex-col overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-3)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="font-display text-[16px] font-semibold text-ink">Review · {cls.klass}</div>
            <div className="text-[12px] text-ink-4">
              {cls.count} students · advancing to {cls.next}
            </div>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-[10px] text-ink-3 transition hover:bg-secondary">
            <Icon name="x" size={17} />
          </button>
        </div>
        <div className="overflow-y-auto">
          {cls.students.map((s) => {
            const ch = choiceOf(s.id);
            return (
              <div key={s.id} className="flex items-center gap-3 border-b border-border px-5 py-2.5 last:border-0">
                <Avatar name={s.name} hue={s.hue} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">{s.name}</span>
                  <span className="block text-[11.5px] text-ink-4">{cls.klass}</span>
                </span>
                <div className="flex gap-1 rounded-[10px] bg-secondary p-1">
                  {(["promote", "repeat"] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setChoice((p) => ({ ...p, [s.id]: opt }))}
                      className="h-7 rounded-[7px] px-2.5 text-[11.5px] font-medium capitalize transition"
                      style={ch === opt ? { background: opt === "promote" ? "var(--color-forest)" : "var(--color-amber)", color: "#fff" } : { color: "var(--color-ink-3)" }}
                    >
                      {opt === "promote" ? (grad ? "Graduate" : "Promote") : "Repeat"}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border bg-secondary/40 px-5 py-4">
          <Button kind="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button kind="primary" size="sm" icon="check" disabled={pending} onClick={() => onApply(cls.students.map((s) => ({ studentId: s.id, mode: choiceOf(s.id) })))}>
            {pending ? "Applying…" : `Apply to ${cls.count} students`}
          </Button>
        </div>
      </div>
    </div>
  );
}
