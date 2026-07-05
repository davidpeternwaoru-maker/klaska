"use client";

// AI Outcomes on real data: readiness KPIs, risk split, per-class readiness,
// intervention list with concrete next actions, full student table.

import { Card, Pill, BarRow } from "@/components/ui/primitives";
import { KPI } from "@/components/ui/KPI";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import type { AIOutcomes, RiskCat } from "@/lib/ai-real";

const CAT_META: Record<RiskCat, { label: string; tone: "green" | "amber" | "red" }> = {
  on: { label: "On track", tone: "green" },
  border: { label: "Borderline", tone: "amber" },
  risk: { label: "At risk", tone: "red" },
};
const hueOf = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

export function AIOutcomesView({ a }: { a: AIOutcomes }) {
  if (a.students.length === 0) {
    return (
      <Card className="text-center text-[13px] text-ink-4">
        The engine needs scores first — enter results (and mark attendance), then predictions appear here.
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI label="On track" value={`${a.onTrackPct}%`} delta={`${a.counts.on} students`} deltaTone="green" sub="" icon="ai" />
        <KPI label="Borderline" value={String(a.counts.border)} delta="need a push" deltaTone="amber" sub="" icon="alert" />
        <KPI label="At risk" value={String(a.counts.risk)} delta="intervene now" deltaTone="red" sub="" icon="target" />
        <KPI label="Exam classes on track" value={a.examOnTrackPct != null ? `${a.examOnTrackPct}%` : "—"} delta="JSS 3 · SSS 2 · SSS 3" sub="" icon="reports" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* per-class readiness */}
        <Card>
          <div className="mb-4 text-[14px] font-semibold text-ink">Readiness by class</div>
          <div className="flex flex-col gap-3">
            {a.byClass.map((c) => (
              <BarRow key={c.label} label={c.label} value={c.pct} max={100} sub={`${c.on}✓ ${c.border}• ${c.risk}!`} tone={c.pct >= 65 ? "forest" : c.pct >= 40 ? "amber" : "red"} />
            ))}
          </div>
        </Card>

        {/* interventions */}
        <Card pad={0} className="overflow-hidden">
          <div className="flex items-center gap-2 p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-amber-soft text-amber-2">
              <Icon name="sparkle" size={16} />
            </span>
            <div>
              <div className="text-[14px] font-semibold text-ink">Suggested interventions</div>
              <div className="text-[11.5px] text-ink-4">Who needs help before it's too late — and what to do.</div>
            </div>
          </div>
          {a.interventions.length === 0 ? (
            <div className="px-4 pb-6 text-[13px] text-ink-4">Everyone is on track. 🎉</div>
          ) : (
            <div className="max-h-[42vh] divide-y divide-border overflow-auto border-t border-border">
              {a.interventions.map((s) => (
                <div key={s.studentId} className="flex items-start gap-3 px-4 py-2.5">
                  <Avatar name={s.name} hue={hueOf(s.studentId)} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-medium text-ink">{s.name}</span>
                      <span className="text-[11.5px] text-ink-4">{s.classLabel}</span>
                      <Pill tone={CAT_META[s.cat].tone}>{s.predicted}%</Pill>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {s.actions.map((x) => (
                        <span key={x} className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-ink-3">{x}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* full table */}
      <Card pad={0} className="overflow-hidden">
        <div className="p-4 text-[14px] font-semibold text-ink">Every student</div>
        <div className="max-h-[55vh] overflow-auto border-t border-border">
          <table className="w-full border-collapse text-[13px]">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border text-[11px] uppercase tracking-[0.05em] text-ink-4">
                <th className="px-4 py-2.5 text-left font-medium">Student</th>
                <th className="px-4 py-2.5 text-left font-medium">Class</th>
                <th className="px-4 py-2.5 text-right font-medium">Average</th>
                <th className="px-4 py-2.5 text-right font-medium">Attendance</th>
                <th className="px-4 py-2.5 text-left font-medium">Weak subjects</th>
                <th className="px-4 py-2.5 text-right font-medium">Readiness</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {[...a.students].sort((x, y) => x.predicted - y.predicted).map((s) => (
                <tr key={s.studentId} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={s.name} hue={hueOf(s.studentId)} size={28} />
                      <span className="font-medium text-ink">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-ink-3">{s.classLabel}</td>
                  <td className="px-4 py-2.5 text-right text-ink-3">{s.average}%</td>
                  <td className="px-4 py-2.5 text-right text-ink-3">{s.attRate != null ? `${s.attRate}%` : "—"}</td>
                  <td className="px-4 py-2.5">
                    {s.weak.length ? (
                      <span className="flex flex-wrap gap-1">
                        {s.weak.map((w) => (
                          <Pill key={w.subject} tone="red">{w.subject} {w.total}</Pill>
                        ))}
                      </span>
                    ) : (
                      <span className="text-ink-4">none</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-ink">{s.predicted}%</td>
                  <td className="px-4 py-2.5"><Pill tone={CAT_META[s.cat].tone}>{CAT_META[s.cat].label}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
