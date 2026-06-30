"use client";

import { useMemo, useState } from "react";
import { Card, SectionTitle, Pill, Button } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/Avatar";
import { Icon, type IconName } from "@/components/ui/Icon";
import { earlyYearsData, upperPrimaryData, secondaryData, examStudents, ageOf, EY_SKILLS } from "@/data/ai";
import { niceClass } from "@/data/people";

type Scope = "early" | "upper" | "secondary";
const SCOPES: { id: Scope; icon: IconName; name: string; range: string }[] = [
  { id: "early", icon: "sparkle", name: "Early Years", range: "Crèche – Primary 2" },
  { id: "upper", icon: "target", name: "Upper Primary", range: "Primary 3 – 6" },
  { id: "secondary", icon: "reports", name: "Secondary", range: "JSS 1 – SSS 3" },
];
const HEADERS: Record<Scope, { title: string; sub: string }> = {
  early: { title: "Spot the children who need help early — gently", sub: 'The same "predict and help early" idea — measured as developmental milestones, not exams.' },
  upper: { title: "Get every child ready for Common Entrance & BECE", sub: "An early-warning view for placement and BECE readiness across upper primary." },
  secondary: { title: "Klaska tells you who will fail — before it happens", sub: "Turns attendance, CA and test data into exam-readiness intelligence, with concrete fixes." },
};
const TINT: Record<string, { bg: string; fg: string }> = {
  amber: { bg: "var(--color-amber-soft)", fg: "var(--color-amber-2)" },
  green: { bg: "var(--color-forest-soft)", fg: "var(--color-forest)" },
  red: { bg: "var(--color-red-soft)", fg: "var(--color-red)" },
};

export function AIEnginePage() {
  const [scope, setScope] = useState<Scope>("secondary");
  const h = HEADERS[scope];
  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle
        eyebrow="AI Outcomes Engine"
        title={h.title}
        sub={h.sub}
        right={
          <>
            <Pill tone="forest">
              <span className="mr-0.5 inline-block h-1.5 w-1.5 rounded-full bg-green" /> Model updated 9 min ago
            </Pill>
            <Button kind="ghost" size="sm" icon="download">
              Export
            </Button>
          </>
        }
      />

      {/* scope cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {SCOPES.map((s) => {
          const on = scope === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setScope(s.id)}
              className={`flex items-center gap-3 rounded-2xl border-2 bg-card p-4 text-left transition ${on ? "border-forest shadow-[var(--shadow-glow)]" : "border-border hover:border-forest-line"}`}
            >
              <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-[12px] ${on ? "bg-forest text-white" : "bg-secondary text-ink-3"}`}>
                <Icon name={s.icon} size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-ink">{s.name}</span>
                <span className="block text-[12.5px] text-ink-4">{s.range}</span>
              </span>
              {on && <Pill tone="forest">Viewing</Pill>}
            </button>
          );
        })}
      </div>

      <div className="mt-5 k-rise">
        {scope === "early" && <EarlyYears />}
        {scope === "upper" && <UpperPrimary />}
        {scope === "secondary" && <Secondary />}
      </div>
    </div>
  );
}

/* ============================ EARLY YEARS ============================ */
function EarlyYears() {
  const d = useMemo(() => earlyYearsData(), []);
  return (
    <>
      <div className="overflow-hidden rounded-2xl text-white shadow-[var(--shadow-2)]" style={{ background: "linear-gradient(120deg,#ee8a2a,#d9650f)" }}>
        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[300px_1fr]">
          <div className="lg:border-r lg:border-white/15 lg:pr-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70">Early Years · {d.count} children</div>
            <div className="mt-3 flex items-end gap-2">
              <span className="font-display text-[56px] font-bold leading-none">{d.toWatch.length}</span>
              <span className="mb-1.5 text-[14px] leading-tight text-white/85">children to<br />watch gently</span>
            </div>
            <div className="mt-5 flex gap-8">
              <div>
                <div className="font-display text-[22px] font-bold">{d.thriving}</div>
                <div className="text-[12px] text-white/70">thriving</div>
              </div>
              <div>
                <div className="font-display text-[22px] font-bold">{d.onMilestonePct}%</div>
                <div className="text-[12px] text-white/70">on milestone</div>
              </div>
            </div>
          </div>
          <div>
            <p className="font-display text-[22px] font-bold leading-snug">
              A few little ones are a step behind on literacy and numeracy milestones. Catching it now — with play, not pressure — makes all the difference.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              {d.perSkill.map((p) => (
                <div key={p.key} className="rounded-[12px] bg-white/12 p-3">
                  <div className="text-[11px] text-white/75">{p.key}</div>
                  <div className="mt-0.5 font-display text-[20px] font-bold">{p.pct}%</div>
                  <div className="text-[11px] text-white/65">{p.toSupport} to support</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 px-6 py-3 text-[12.5px] text-white/75">Built from teacher skill observations — refreshed each week. No tests, no ranking. Just early, caring support.</div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <div className="font-display text-[16px] font-semibold text-ink">Milestone progress</div>
          <div className="text-[12.5px] text-ink-4">Average across Early Years</div>
          <div className="mt-5 flex flex-col gap-4">
            {d.perSkill.map((p) => (
              <div key={p.key}>
                <div className="mb-1.5 flex items-center gap-2 text-[13px]">
                  <Icon name={p.icon} size={15} style={{ color: "var(--color-ink-4)" }} />
                  <span className="flex-1 font-medium text-ink">{p.label}</span>
                  <span className="font-semibold text-ink">{p.pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: "var(--color-amber)" }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className="font-display text-[16px] font-semibold text-ink">What teachers can do this week</div>
          <div className="text-[12.5px] text-ink-4">Gentle, play-based suggestions — delivered to teachers</div>
          <div className="mt-4 flex flex-col gap-3">
            {d.suggestions.map((s) => (
              <SuggestionCard key={s.title} {...s} />
            ))}
          </div>
        </Card>
      </div>

      <Card pad={0} className="mt-5 overflow-hidden">
        <div className="flex items-center justify-between p-5">
          <div className="font-display text-[16px] font-semibold text-ink">
            Children to support early <span className="font-normal text-ink-4">· {d.toWatch.length}</span>
          </div>
          <select className="h-9 rounded-[10px] border border-border bg-card px-3 text-[13px] font-medium outline-none focus:border-forest">
            <option>All skill areas</option>
            {EY_SKILLS.map((s) => (
              <option key={s.key}>{s.key}</option>
            ))}
          </select>
        </div>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-y border-border text-[11px] uppercase tracking-[0.05em] text-ink-4">
              <th className="px-5 py-2.5 text-left font-medium">Child</th>
              <th className="px-5 py-2.5 text-left font-medium">Class</th>
              <th className="px-5 py-2.5 text-left font-medium">Areas to support</th>
              <th className="px-5 py-2.5 text-right font-medium">Progress</th>
            </tr>
          </thead>
          <tbody>
            {d.toWatch.slice(0, 30).map((e) => (
              <tr key={e.s.id} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/60">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={e.s.name} hue={e.s.hue} size={32} />
                    <span>
                      <span className="block font-medium text-ink">{e.s.name}</span>
                      <span className="block text-[11.5px] text-ink-4">age {ageOf(e.s)}</span>
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-ink-3">{niceClass(e.s)}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {e.weak.map((w) => (
                      <Pill key={w} tone="amber">{w}</Pill>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="ml-auto flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-red" style={{ width: `${(e.met / 5) * 100}%` }} />
                    </div>
                    <Icon name="chevR" size={15} style={{ color: "var(--color-ink-4)" }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function SuggestionCard({ icon, tone, title, body }: { icon: string; tone: string; title: string; body: string }) {
  const t = TINT[tone];
  return (
    <div className="flex gap-3 rounded-[14px] p-3.5" style={{ background: t.bg }}>
      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-white/70" style={{ color: t.fg }}>
        <Icon name={icon} size={16} />
      </span>
      <div>
        <div className="text-[13.5px] font-semibold text-ink">{title}</div>
        <p className="mt-0.5 text-[12.5px] text-ink-2">{body}</p>
      </div>
    </div>
  );
}

/* ============================ UPPER PRIMARY ============================ */
const CAT_PILL: Record<string, "green" | "amber" | "red"> = { on: "green", border: "amber", risk: "red" };
const CAT_LABEL: Record<string, string> = { on: "On track", border: "Borderline", risk: "At risk" };

function UpperPrimary() {
  const d = useMemo(() => upperPrimaryData(), []);
  const [tab, setTab] = useState("all");
  const pc = (n: number) => (d.count ? Math.round((n / d.count) * 100) : 0);
  const rows = d.list.filter((r) => tab === "all" || r.cat === tab).slice(0, 40);

  return (
    <>
      <div className="overflow-hidden rounded-2xl text-white shadow-[var(--shadow-2)]" style={{ background: "linear-gradient(120deg,#2155b0,#173e85)" }}>
        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[300px_1fr]">
          <div className="lg:border-r lg:border-white/15 lg:pr-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70">Upper Primary · {d.count} pupils</div>
            <div className="mt-3 font-display text-[56px] font-bold leading-none">{d.avgReadiness}%</div>
            <div className="mt-2 text-[13px] text-white/80">average Common Entrance readiness</div>
          </div>
          <div>
            <p className="font-display text-[22px] font-bold leading-snug">
              <span className="text-[#ffd27a]">{d.counts.risk} pupils</span> need a boost before Common Entrance & BECE. The same early-warning that powers our secondary engine — measured for their age.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2.5">
              <CohortBox color="#7BC681" label="On track" value={d.counts.on} sub={`${pc(d.counts.on)}% of cohort`} />
              <CohortBox color="#ffce6e" label="Borderline" value={d.counts.border} sub={`${pc(d.counts.border)}% of cohort`} />
              <CohortBox color="#ff9a8a" label="At risk" value={d.counts.risk} sub={`${pc(d.counts.risk)}% of cohort`} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <div className="font-display text-[16px] font-semibold text-ink">Readiness by class</div>
          <div className="text-[12.5px] text-ink-4">Predicted placement readiness</div>
          <div className="mt-5 flex flex-col gap-4">
            {d.byClass.map((c) => (
              <div key={c.level}>
                <div className="mb-1.5 flex items-center justify-between text-[13px]">
                  <span className="font-medium text-ink">{c.level} · {c.n}</span>
                  <span className="font-semibold text-ink">{c.pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-forest" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className="font-display text-[16px] font-semibold text-ink">Recommended for teachers</div>
          <div className="text-[12.5px] text-ink-4">Targeted worksheets given to the class teacher</div>
          <div className="mt-4 flex flex-col gap-3">
            {d.recommended.map((s) => (
              <SuggestionCard key={s.title} {...s} />
            ))}
          </div>
        </Card>
      </div>

      <Card pad={0} className="mt-5 overflow-hidden">
        <div className="p-4">
          <RiskTabs tab={tab} setTab={setTab} all={d.count} counts={d.counts} />
        </div>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-y border-border text-[11px] uppercase tracking-[0.05em] text-ink-4">
              <th className="px-5 py-2.5 text-left font-medium">Pupil</th>
              <th className="px-5 py-2.5 text-left font-medium">Class</th>
              <th className="px-5 py-2.5 text-left font-medium">Pathway</th>
              <th className="px-5 py-2.5 text-left font-medium">Weak subjects</th>
              <th className="px-5 py-2.5 text-right font-medium">Readiness</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.s.id} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/60">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={r.s.name} hue={r.s.hue} size={32} />
                    <span>
                      <span className="block font-medium text-ink">{r.s.name}</span>
                      <span className="block font-mono text-[11px] text-ink-4">{r.s.admissionNo}</span>
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-ink-3">{niceClass(r.s)}</td>
                <td className="px-5 py-3">
                  <Pill tone="blue">{r.pathway}</Pill>
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {r.weak.length ? r.weak.map((w) => <Pill key={w} tone="amber">{w}</Pill>) : <span className="text-ink-4">—</span>}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-display text-[15px] font-bold text-ink">{r.readiness}%</span>
                    <Pill tone={CAT_PILL[r.cat]}>{CAT_LABEL[r.cat]}</Pill>
                    <Icon name="chevR" size={15} style={{ color: "var(--color-ink-4)" }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function CohortBox({ color, label, value, sub }: { color: string; label: string; value: number; sub: string }) {
  return (
    <div className="rounded-[12px] bg-white/12 p-3.5">
      <div className="flex items-center gap-1.5 text-[12px] text-white/80">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} /> {label}
      </div>
      <div className="mt-1 font-display text-[26px] font-bold leading-none">{value}</div>
      <div className="mt-1 text-[11.5px] text-white/65">{sub}</div>
    </div>
  );
}

function RiskTabs({ tab, setTab, all, counts }: { tab: string; setTab: (v: string) => void; all: number; counts: { on: number; border: number; risk: number } }) {
  const items = [
    { v: "all", l: `All ${all}` },
    { v: "risk", l: `At risk ${counts.risk}` },
    { v: "border", l: `Borderline ${counts.border}` },
    { v: "on", l: `On track ${counts.on}` },
  ];
  return (
    <div className="inline-flex flex-wrap gap-0.5 rounded-[10px] bg-secondary p-1">
      {items.map((t) => (
        <button key={t.v} onClick={() => setTab(t.v)} className={`h-8 rounded-[7px] px-3.5 text-[12.5px] font-medium transition ${tab === t.v ? "bg-card text-ink shadow-[0_1px_2px_rgba(20,20,18,0.06)]" : "text-ink-3 hover:text-ink"}`}>
          {t.l}
        </button>
      ))}
    </div>
  );
}

/* ============================ SECONDARY ============================ */
const SUB_TABS: { id: string; label: string; icon: IconName }[] = [
  { id: "situation", label: "Situation Room", icon: "trend" },
  { id: "readiness", label: "Exam readiness", icon: "target" },
  { id: "interventions", label: "Interventions", icon: "sparkle" },
  { id: "marking", label: "AI marking", icon: "card" },
  { id: "planner", label: "Lesson planner", icon: "reports" },
];

function Secondary() {
  const [sub, setSub] = useState("situation");
  return (
    <>
      <div className="mb-5 inline-flex flex-wrap gap-0.5 rounded-[12px] border border-border bg-card p-1">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={`flex items-center gap-2 rounded-[9px] px-3.5 py-2 text-[13px] font-medium transition ${sub === t.id ? "bg-forest text-white" : "text-ink-3 hover:bg-secondary"}`}
          >
            <Icon name={t.icon} size={15} /> {t.label}
          </button>
        ))}
      </div>
      {sub === "situation" && <SituationRoom />}
      {sub === "readiness" && <ExamReadiness />}
      {sub === "interventions" && <Interventions />}
      {sub === "marking" && <AIMarking />}
      {sub === "planner" && <LessonPlanner />}
    </>
  );
}

function SituationRoom() {
  const d = useMemo(() => secondaryData(), []);
  const total = d.list.length || 1;
  const pc = (n: number) => Math.round((n / total) * 100);
  return (
    <>
      <div className="overflow-hidden rounded-2xl text-white shadow-[var(--shadow-2)]" style={{ background: "linear-gradient(120deg,#1d6322,#0f3812)" }}>
        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[300px_1fr]">
          <div className="flex flex-col items-center justify-center lg:border-r lg:border-white/15 lg:pr-6">
            <Gauge pct={d.predictedPass} target={85} />
            <div className="mt-2 text-center text-[13px] text-white/80">Predicted whole-school<br />pass rate this session</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70">Situation Room · {d.list.length} exam-class students</div>
            <p className="mt-2 font-display text-[22px] font-bold leading-snug">
              <span className="text-[#ffd27a]">{d.counts.border} SSS 2 students</span> are currently on track to fail WAEC English. Klaska has a plan for each of them.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2.5">
              <CohortBox color="#7BC681" label="On track" value={d.counts.on} sub={`${pc(d.counts.on)}% of cohort`} />
              <CohortBox color="#ffce6e" label="Borderline" value={d.counts.border} sub={`${pc(d.counts.border)}% of cohort`} />
              <CohortBox color="#ff9a8a" label="At risk" value={d.counts.risk} sub={`${pc(d.counts.risk)}% of cohort`} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-white/10 px-6 py-3 text-[12.5px] text-white/75">
          <span>Blends attendance, CA1/CA2 and mock-test data across {d.list.length} students · refreshed continuously</span>
          <button className="ml-auto inline-flex items-center gap-1.5 font-medium text-white hover:underline">
            See interventions <Icon name="arrowR" size={14} />
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-1 flex items-start justify-between">
            <div>
              <div className="font-display text-[16px] font-semibold text-ink">Predicted vs target pass rate</div>
              <div className="text-[12.5px] text-ink-4">Klaska&apos;s prediction is closing on your 85% target</div>
            </div>
            <div className="flex items-center gap-3 text-[12px] font-medium">
              <span className="inline-flex items-center gap-1.5 text-ink-3"><span className="h-2 w-2 rounded-full bg-forest" /> Predicted</span>
              <span className="inline-flex items-center gap-1.5 text-ink-3"><span className="h-2 w-2 rounded-full bg-amber" /> Target</span>
            </div>
          </div>
          <DualLine data={d.predictedVsTarget} />
        </Card>
        <Card>
          <div className="font-display text-[16px] font-semibold text-ink">AI insights</div>
          <div className="text-[12.5px] text-ink-4">Generated from this week&apos;s data</div>
          <div className="mt-4 flex flex-col gap-3">
            {d.insights.map((s) => (
              <SuggestionCard key={s.title} {...s} />
            ))}
          </div>
        </Card>
      </div>

      <Card pad={0} className="mt-5 overflow-hidden">
        <div className="flex items-center justify-between p-5">
          <div className="font-display text-[16px] font-semibold text-ink">Readiness by exam class</div>
          <Pill tone="neutral">JSS 3 · SSS 2 · SSS 3</Pill>
        </div>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-y border-border text-[11px] uppercase tracking-[0.05em] text-ink-4">
              <th className="px-5 py-2.5 text-left font-medium">Class</th>
              <th className="px-5 py-2.5 text-left font-medium">Exam</th>
              <th className="px-5 py-2.5 text-left font-medium">Risk distribution</th>
              <th className="px-5 py-2.5 text-right font-medium">Predicted pass</th>
            </tr>
          </thead>
          <tbody>
            {d.byExamClass.map((c) => (
              <tr key={c.klass} className="border-b border-border last:border-0">
                <td className="px-5 py-3.5 font-display text-[15px] font-semibold text-ink">{c.klass}</td>
                <td className="px-5 py-3.5">
                  <Pill tone="blue">{c.exam}</Pill>
                </td>
                <td className="px-5 py-3.5">
                  <StackBar on={c.on} border={c.border} risk={c.risk} />
                  <div className="mt-1.5 flex gap-3 text-[11.5px] text-ink-4">
                    <span><b className="text-ink">{c.on}</b> on track</span>
                    <span><b className="text-ink">{c.border}</b> borderline</span>
                    <span><b className="text-ink">{c.risk}</b> at risk</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right font-display text-[18px] font-bold text-ink">{c.pass}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function ExamReadiness() {
  const list = useMemo(() => examStudents(), []);
  const counts = { on: list.filter((e) => e.cat === "on").length, border: list.filter((e) => e.cat === "border").length, risk: list.filter((e) => e.cat === "risk").length };
  const [tab, setTab] = useState("all");
  const rows = list.filter((r) => tab === "all" || r.cat === tab).sort((a, b) => a.predicted - b.predicted).slice(0, 40);
  const pc = list.length ? Math.round((counts.on / list.length) * 100) : 0;
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniKPI label="Students assessed" value={String(list.length)} sub="JSS 3, SSS 2 & SSS 3" icon="target" />
        <MiniKPI label="On track" value={String(counts.on)} delta={`${pc}%`} tone="green" sub="" icon="check" />
        <MiniKPI label="Borderline" value={String(counts.border)} delta="watch closely" tone="amber" sub="" icon="clock" />
        <MiniKPI label="At risk" value={String(counts.risk)} delta="need intervention" tone="red" sub="" icon="alert" />
      </div>
      <Card pad={0} className="mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <RiskTabs tab={tab} setTab={setTab} all={list.length} counts={counts} />
          <select className="h-9 rounded-[10px] border border-border bg-card px-3 text-[13px] font-medium outline-none focus:border-forest">
            <option>All exam classes</option>
            <option>BECE</option>
            <option>WAEC mock</option>
            <option>WAEC/NECO</option>
          </select>
        </div>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-y border-border text-[11px] uppercase tracking-[0.05em] text-ink-4">
              <th className="px-5 py-2.5 text-left font-medium">Student</th>
              <th className="px-5 py-2.5 text-left font-medium">Class</th>
              <th className="px-5 py-2.5 text-left font-medium">Exam</th>
              <th className="px-5 py-2.5 text-left font-medium">Weak subjects</th>
              <th className="px-5 py-2.5 text-right font-medium">Predicted</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.s.id} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/60">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={r.s.name} hue={r.s.hue} size={32} />
                    <span>
                      <span className="block font-medium text-ink">{r.s.name}</span>
                      <span className="block font-mono text-[11px] text-ink-4">{r.s.admissionNo}</span>
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-ink-3">{r.klass}</td>
                <td className="px-5 py-3">
                  <Pill tone="blue">{r.exam}</Pill>
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {r.weak.length ? r.weak.map((w) => <Pill key={w.subject} tone="amber">{w.subject} {w.score}</Pill>) : <span className="text-ink-4">—</span>}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-display text-[15px] font-bold" style={{ color: r.cat === "risk" ? "var(--color-red)" : "var(--color-ink)" }}>{r.predicted}%</span>
                    <Pill tone={CAT_PILL[r.cat]}>{CAT_LABEL[r.cat]}</Pill>
                    <Icon name="chevR" size={15} style={{ color: "var(--color-ink-4)" }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function Interventions() {
  const d = useMemo(() => secondaryData(), []);
  return (
    <>
      <Card className="mb-5 flex flex-wrap items-center gap-4">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[12px] bg-forest-soft text-forest">
          <Icon name="sparkle" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-ink">{d.interventions.length} recommended interventions</div>
          <div className="text-[12.5px] text-ink-4">Each at-risk student has a specific weak topic and a suggested action. Assign with one tap — the teacher and parent are notified.</div>
        </div>
        <Button kind="primary" size="md" icon="check">
          Assign all
        </Button>
      </Card>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {d.interventions.map((iv) => (
          <Card key={iv.s.id}>
            <div className="flex items-start gap-3">
              <Avatar name={iv.s.name} hue={iv.s.hue} size={40} />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-ink">{iv.s.name}</div>
                <div className="text-[12px] text-ink-4">{iv.klass} · {iv.exam}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-[18px] font-bold" style={{ color: iv.cat === "risk" ? "var(--color-red)" : "var(--color-amber-2)" }}>{iv.predicted}%</div>
                <Pill tone={CAT_PILL[iv.cat]}>{CAT_LABEL[iv.cat]}</Pill>
              </div>
            </div>
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-4">Weak area</span>
              <Pill tone="red">{iv.weakArea.subject} · {iv.weakArea.score}%</Pill>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {iv.topics.map((t) => (
                <span key={t} className="rounded-full bg-secondary px-2.5 py-1 text-[12px] font-medium text-ink-2">{t}</span>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-[12px] bg-forest-soft p-3 text-[12.5px] text-ink-2">
              <Icon name="sparkle" size={15} style={{ color: "var(--color-forest)" }} />
              <span><b>Recommended:</b> {iv.action}. Projected gain <b className="text-forest">+{iv.gain} pts</b>.</span>
            </div>
            <div className="mt-3 flex gap-2">
              <Button kind="ghost" size="sm" style={{ flex: 1, justifyContent: "center" }}>
                Edit plan
              </Button>
              <Button kind="primary" size="sm" icon="sparkle" style={{ flex: 1, justifyContent: "center" }}>
                Assign
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function AIMarking() {
  const [scanned, setScanned] = useState(false);
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
            <Icon name="card" size={18} /> Snap a script to auto-grade
          </div>
          <Pill tone="blue">SSS 2A · English mock</Pill>
        </div>
        <div className="flex h-[300px] items-center justify-center rounded-[14px] bg-ink p-8">
          <div className="w-full max-w-[260px] rounded-[6px] bg-[#f3f1ea] p-5 shadow-lg">
            {[90, 78, 85, 70, 88, 60, 82, 74].map((w, i) => (
              <div key={i} className="mb-2.5 h-2 rounded-full bg-[#d9d5c8]" style={{ width: `${w}%` }} />
            ))}
            <svg viewBox="0 0 120 16" className="mt-3 w-1/2">
              <path d="M2 8 q 10 -8 20 0 t 20 0 t 20 0 t 20 0" fill="none" stroke="#8a86c4" strokeWidth="2" />
            </svg>
          </div>
        </div>
        <Button kind="primary" size="md" icon="card" style={{ width: "100%", justifyContent: "center", marginTop: 16 }} onClick={() => setScanned(true)}>
          Scan script & grade
        </Button>
      </Card>
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
            <Icon name="reports" size={18} /> Auto-graded result
          </div>
          <Pill tone={scanned ? "green" : "neutral"}>{scanned ? "Graded" : "Awaiting scan"}</Pill>
        </div>
        {scanned ? (
          <div>
            <div className="rounded-[12px] bg-forest-soft p-4 text-center">
              <div className="font-display text-[34px] font-bold text-forest">68/100</div>
              <div className="text-[12.5px] text-ink-3">Grade C6 · fed into the readiness model</div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {[
                ["Q1 · Comprehension", 14, 20],
                ["Q2 · Summary", 16, 20],
                ["Q3 · Lexis & structure", 18, 30],
                ["Q4 · Essay", 20, 30],
              ].map(([q, got, max]) => (
                <div key={q as string} className="flex items-center justify-between rounded-[10px] bg-secondary px-3 py-2 text-[13px]">
                  <span className="text-ink-2">{q}</span>
                  <span className="font-semibold text-ink">{got} / {max}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex h-[280px] flex-col items-center justify-center text-center">
            <Icon name="reports" size={40} style={{ color: "var(--color-ink-4)", opacity: 0.5 }} />
            <p className="mt-3 max-w-[260px] text-[13px] text-ink-4">Scan a script to see extracted answers, per-question marks and the grade — automatically fed into the readiness model.</p>
          </div>
        )}
      </Card>
    </div>
  );
}

function LessonPlanner() {
  const [subject, setSubject] = useState("Biology");
  const [klass, setKlass] = useState("SSS 1");
  const [weeks, setWeeks] = useState("4");
  const [generated, setGenerated] = useState(false);
  const SUBJECTS = ["Biology", "Mathematics", "English", "Physics", "Chemistry", "Economics"];
  const CLASSES = ["JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3"];
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
      <Card>
        <div className="mb-4 flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
          <Icon name="reports" size={18} /> Generate a scheme of work
        </div>
        <div className="flex flex-col gap-4">
          <PSelect label="Subject" value={subject} onChange={setSubject} options={SUBJECTS} />
          <PSelect label="Class" value={klass} onChange={setKlass} options={CLASSES} />
          <PSelect label="Number of weeks" value={weeks} onChange={setWeeks} options={["2", "3", "4", "6", "8"]} />
          <div className="flex items-center gap-2 rounded-[10px] bg-forest-soft p-3 text-[12.5px] text-ink-2">
            <Icon name="check" size={15} style={{ color: "var(--color-forest)" }} />
            Aligned to the <b>2025/26 NERDC curriculum</b> for {klass}.
          </div>
          <Button kind="primary" size="md" icon="sparkle" style={{ width: "100%", justifyContent: "center" }} onClick={() => setGenerated(true)}>
            Generate scheme of work
          </Button>
        </div>
      </Card>
      <Card>
        <div className="font-display text-[15px] font-semibold text-ink">{subject} · {klass}</div>
        <div className="text-[12.5px] text-ink-4">Scheme of work — {weeks} weeks · 2nd Term</div>
        {generated ? (
          <div className="mt-4 flex flex-col gap-2.5">
            {Array.from({ length: +weeks }, (_, i) => (
              <div key={i} className="rounded-[12px] border border-border p-3.5">
                <div className="text-[13px] font-semibold text-ink">Week {i + 1}</div>
                <div className="mt-0.5 text-[12.5px] text-ink-3">{["Cell structure & organisation", "Nutrition in plants & animals", "Transport systems", "Reproduction & growth", "Ecology basics", "Genetics intro", "Evolution overview", "Revision & assessment"][i] ?? "Topic & objectives"}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-[260px] flex-col items-center justify-center text-center">
            <Icon name="reports" size={40} style={{ color: "var(--color-ink-4)", opacity: 0.5 }} />
            <p className="mt-3 text-[13px] text-ink-4">Choose a subject and class, then generate.</p>
          </div>
        )}
      </Card>
    </div>
  );
}

function PSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <div className="mb-1.5 text-[12.5px] font-medium text-ink-3">{label}</div>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full appearance-none rounded-[10px] border border-border bg-card px-3.5 text-[14px] font-medium outline-none focus:border-forest">
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <Icon name="chevD" size={15} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-ink-4)", pointerEvents: "none" }} />
      </div>
    </div>
  );
}

/* ---- small shared visuals ---- */
function MiniKPI({ label, value, delta, tone, sub, icon }: { label: string; value: string; delta?: string; tone?: "green" | "amber" | "red"; sub: string; icon: IconName }) {
  const col = tone === "red" ? "var(--color-red)" : tone === "amber" ? "var(--color-amber-2)" : "var(--color-forest)";
  return (
    <Card hover className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-4">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-secondary text-ink-3">
          <Icon name={icon} size={16} />
        </span>
      </div>
      <div className="font-display text-[28px] font-bold leading-none tracking-[-0.03em]">{value}</div>
      {delta && <div className="text-[12px] font-medium" style={{ color: col }}>{delta}</div>}
      {sub && <div className="text-[11.5px] text-ink-4">{sub}</div>}
    </Card>
  );
}

function Gauge({ pct, target }: { pct: number; target: number }) {
  const size = 168;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const len = Math.PI * r;
  return (
    <svg width={size} height={size / 2 + 14} viewBox={`0 0 ${size} ${size / 2 + 14}`}>
      <path d={`M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}`} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={stroke} strokeLinecap="round" />
      <path
        d={`M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}`}
        fill="none"
        stroke="#ffce6e"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(len * pct) / 100} ${len}`}
      />
      <text x={cx} y={cy - 14} textAnchor="middle" style={{ fontSize: 34, fontWeight: 700, fontFamily: "var(--font-display)", fill: "#fff" }}>
        {pct}%
      </text>
      <text x={cx} y={cy + 4} textAnchor="middle" style={{ fontSize: 11, fill: "rgba(255,255,255,0.75)" }}>
        target {target}%
      </text>
    </svg>
  );
}

function DualLine({ data }: { data: { t: string; pred: number; target: number }[] }) {
  const w = 560;
  const h = 200;
  const padX = 8;
  const padY = 18;
  const min = 50;
  const max = 95;
  const x = (i: number) => padX + (i * (w - padX * 2)) / (data.length - 1);
  const y = (v: number) => padY + (1 - (v - min) / (max - min)) * (h - padY * 2);
  const predLine = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.pred)}`).join(" ");
  const tgtLine = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.target)}`).join(" ");
  const area = `${predLine} L${x(data.length - 1)},${h - padY} L${x(0)},${h - padY} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} className="mt-3">
      {[50, 65, 80, 95].map((g) => (
        <g key={g}>
          <line x1={padX} x2={w - padX} y1={y(g)} y2={y(g)} stroke="var(--color-border)" strokeDasharray="3 4" />
          <text x={padX} y={y(g) - 3} style={{ fontSize: 9, fill: "var(--color-ink-4)" }}>{g}%</text>
        </g>
      ))}
      <path d={area} fill="rgba(27,94,32,0.08)" />
      <path d={tgtLine} fill="none" stroke="var(--color-amber)" strokeWidth={2} strokeDasharray="6 5" strokeLinecap="round" />
      <path d={predLine} fill="none" stroke="var(--color-forest)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={i} cx={x(i)} cy={y(d.pred)} r={3} fill="#fff" stroke="var(--color-forest)" strokeWidth={1.6} />
      ))}
      {data.map((d, i) => (
        <text key={i} x={x(i)} y={h - 4} textAnchor="middle" style={{ fontSize: 9, fill: "var(--color-ink-4)" }}>{d.t}</text>
      ))}
    </svg>
  );
}

function StackBar({ on, border, risk }: { on: number; border: number; risk: number }) {
  const total = on + border + risk || 1;
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-secondary">
      <div style={{ width: `${(on / total) * 100}%`, background: "var(--color-forest)" }} />
      <div style={{ width: `${(border / total) * 100}%`, background: "var(--color-amber)" }} />
      <div style={{ width: `${(risk / total) * 100}%`, background: "var(--color-red)" }} />
    </div>
  );
}
