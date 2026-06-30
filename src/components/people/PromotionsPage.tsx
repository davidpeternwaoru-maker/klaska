"use client";

import { useMemo, useState } from "react";
import { Card, SectionTitle, Pill, Button } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { promotionData, type PromoClass } from "@/data/promotions";
import { niceClass, effLevel, type Student } from "@/data/people";
import { usePromotions, recordPromotion, resetPromotions, hasPromotions, nextLevel, PROMO_SESSION } from "@/lib/promotions/promotionsStore";

type Mode = "promote" | "hold" | "repeat";

export function PromotionsPage() {
  const promo = usePromotions();
  const d = useMemo(() => promotionData(), [promo]);
  const [modes, setModes] = useState<Record<string, Mode>>({});
  const [review, setReview] = useState<PromoClass | null>(null);
  const sessionDone = hasPromotions();

  const modeOf = (klass: string): Mode => modes[klass] ?? "promote";

  function applyClass(c: PromoClass, mode: Mode) {
    if (mode === "hold") return;
    if (typeof window !== "undefined" && !window.confirm(`${mode === "repeat" ? "Repeat" : "Promote"} all ${c.count} students in ${c.klass}?`)) return;
    c.students.forEach((s) => recordPromotion(s.id, effLevel(s), s.arm, mode === "repeat" ? "repeat" : "promote"));
  }
  function runEndOfSession() {
    if (typeof window !== "undefined" && !window.confirm(`Run end-of-session for all ${d.totalActive} students? Each advances one class; the SSS 3 cohort graduates.`)) return;
    d.classes.forEach((c) => c.students.forEach((s) => recordPromotion(s.id, effLevel(s), s.arm, modeOf(c.klass) === "repeat" ? "repeat" : "promote")));
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
        sub="Promote students up the JSS → SSS ladder. Every promotion is recorded in the student's full history."
        right={
          <>
            {sessionDone && (
              <Button kind="ghost" size="sm" icon="refresh" onClick={() => resetPromotions()}>
                Undo all
              </Button>
            )}
            <Button kind="ghost" size="sm" icon="download" onClick={exportPlan}>
              Export plan
            </Button>
            <Button kind="primary" size="sm" icon="sparkle" onClick={runEndOfSession}>
              Run end-of-session
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
          <div className="text-[15px] font-semibold text-ink">End of {PROMO_SESSION} session approaches</div>
          <div className="text-[12.5px] text-ink-4">
            In 4 weeks, eligible students move up one class. SSS 3 cohort graduates. Repeated students stay in their current class — all recorded.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="green">
            <Icon name="check" size={12} /> {d.eligible} eligible
          </Pill>
          <Pill tone="amber">
            <Icon name="clock" size={12} /> {d.toReview} to review
          </Pill>
          <Pill tone="blue">
            <Icon name="badge" size={12} /> {d.graduating} graduating
          </Pill>
        </div>
      </Card>

      {/* class cards */}
      <div className="k-stagger grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {d.classes.map((c) => {
          const mode = modeOf(c.klass);
          const grad = c.next === "Graduated";
          return (
            <Card key={c.klass} pad={20}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-display text-[16px] font-semibold text-ink">{c.klass}</div>
                  <div className="truncate text-[12.5px] text-ink-4">{c.teacher}</div>
                </div>
                <ModeSegment value={mode} onChange={(m) => setModes((p) => ({ ...p, [c.klass]: m }))} />
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
                <Button kind="ghost" size="sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => setReview(c)}>
                  Review students
                </Button>
                <Button kind="primary" size="sm" style={{ flex: 1, justifyContent: "center" }} icon={mode === "repeat" ? "minus" : grad ? "badge" : "arrowU"} onClick={() => applyClass(c, mode)}>
                  {mode === "repeat" ? "Repeat class" : grad ? "Graduate class" : "Promote class"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {review && <ReviewModal cls={review} onClose={() => setReview(null)} />}
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

function ReviewModal({ cls, onClose }: { cls: PromoClass; onClose: () => void }) {
  const [choice, setChoice] = useState<Record<string, "promote" | "repeat">>({});
  const choiceOf = (id: string) => choice[id] ?? "promote";
  const grad = cls.next === "Graduated";
  function apply() {
    cls.students.forEach((s) => recordPromotion(s.id, effLevel(s), s.arm, choiceOf(s.id)));
    onClose();
  }
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
          {cls.students.map((s: Student) => {
            const ch = choiceOf(s.id);
            return (
              <div key={s.id} className="flex items-center gap-3 border-b border-border px-5 py-2.5 last:border-0">
                <Avatar name={s.name} hue={s.hue} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">{s.name}</span>
                  <span className="block text-[11.5px] text-ink-4">{niceClass(s)}</span>
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
          <Button kind="primary" size="sm" icon="check" onClick={apply}>
            Apply to {cls.count} students
          </Button>
        </div>
      </div>
    </div>
  );
}
