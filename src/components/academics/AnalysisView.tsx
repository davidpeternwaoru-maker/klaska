"use client";

// Real report-card analysis: school KPIs, then class-by-class — average, best
// student, best per subject, weakest subjects — with a one-click broadsheet
// export (Excel, school header).

import { Card, Pill, BarRow } from "@/components/ui/primitives";
import { KPI } from "@/components/ui/KPI";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { exportBroadsheet, type ExportMeta } from "@/lib/export/real-exports";
import type { SchoolAnalysis } from "@/lib/analysis";

const hueOf = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

export function AnalysisView({ a, meta }: { a: SchoolAnalysis; meta: ExportMeta }) {
  if (a.classes.length === 0) {
    return (
      <Card className="text-center text-[13px] text-ink-4">
        No scores saved yet — enter results first, then the analysis lights up here.
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* school KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI label="School average" value={`${a.schoolAvg}%`} delta={a.termScoped ? "this term" : "all scores"} sub="" icon="reports" />
        <KPI label="Pass rate" value={`${a.passRate}%`} delta="≥ 50%" deltaTone="green" sub="" icon="check" />
        <KPI label="Best student" value={a.bestOverall ? `${a.bestOverall.average}%` : "—"} delta={a.bestOverall?.name ?? ""} sub="" icon="trend" />
        <KPI label="Classes analysed" value={String(a.classes.length)} delta="with scores" sub="" icon="students" />
      </div>

      {/* class by class */}
      {a.classes.map((c) => (
        <Card key={c.classId}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-[15px] font-semibold text-ink">{c.label}</span>
              <Pill tone="neutral">{c.studentsScored} scored</Pill>
              <Pill tone={c.classAvg >= 60 ? "green" : c.classAvg >= 50 ? "amber" : "red"}>{c.classAvg}% class avg</Pill>
            </div>
            <button
              onClick={() => exportBroadsheet(meta, c.label, a.subjectNames[c.classId] ?? [], a.broadsheets[c.classId] ?? [])}
              className="flex items-center gap-1.5 rounded-[9px] border border-border px-3 py-1.5 text-[12.5px] font-medium text-ink-2 transition hover:bg-secondary"
            >
              <Icon name="download" size={14} /> Broadsheet (Excel)
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* best in class */}
            <div>
              {c.best && (
                <div className="flex items-center gap-2.5 rounded-[12px] bg-forest-soft p-3">
                  <Avatar name={c.best.name} hue={hueOf(c.best.name)} size={34} />
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-forest">Best in class</div>
                    <div className="truncate text-[13px] font-semibold text-ink">{c.best.name}</div>
                  </div>
                  <Pill tone="green" style={{ marginLeft: "auto" }}>{c.best.average}%</Pill>
                </div>
              )}
              <div className="mt-4 text-[12px] font-medium text-ink-3">Weakest subjects</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {c.weakest.map((w) => (
                  <Pill key={w.subject} tone="red">{w.subject} · {w.avg}%</Pill>
                ))}
              </div>
            </div>

            {/* subject averages */}
            <div>
              <div className="mb-3 text-[13px] font-semibold text-ink">Class average per subject</div>
              <div className="flex flex-col gap-3">
                {c.subjects.map((s) => (
                  <BarRow key={s.subject} label={s.subject} value={s.avg} max={100} tone={s.avg >= 60 ? "forest" : s.avg >= 50 ? "amber" : "red"} />
                ))}
              </div>
            </div>

            {/* best per subject */}
            <div>
              <div className="mb-3 text-[13px] font-semibold text-ink">Best in each subject</div>
              <div className="flex flex-col divide-y divide-border rounded-[12px] border border-border">
                {c.subjects.map((s) => (
                  <div key={s.subject} className="flex items-center gap-2.5 px-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-ink">{s.best?.name ?? "—"}</span>
                      <span className="block text-[11px] text-ink-4">{s.subject}</span>
                    </span>
                    {s.best && <Pill tone="green">{s.best.total}</Pill>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
