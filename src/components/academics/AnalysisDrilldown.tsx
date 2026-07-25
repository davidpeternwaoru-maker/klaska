"use client";

// Result-analysis drill-down: Whole school → Section → Level → Arm → Department
// (SS) → Subject. Every scope shows the same bundle — overall best, best per
// subject, best per department, most improved (vs last term), subject averages,
// weakest subjects, and the full ranked list — plus xlsx + PDF export. Data is
// already RBAC-scoped by the server; this only navigates within what's allowed.

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, Pill, Button, BarRow } from "@/components/ui/primitives";
import { KPI } from "@/components/ui/KPI";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import type { DrilldownData } from "@/server/services/analysis-drill";
import { computeBundle, type Dim, type Scope } from "@/lib/analysis-compute";
import { exportExcel, exportPdf } from "@/lib/export/engine";
import { analysisReport } from "@/lib/export/reports";

const hueOf = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};
type Crumb = { dim: Dim; key: string; label: string };

export function AnalysisDrilldown({ data }: { data: DrilldownData }) {
  const [path, setPath] = useState<Crumb[]>([]);
  const [busy, setBusy] = useState<null | "xlsx" | "pdf">(null);

  const scope = useMemo<Scope>(() => {
    const s: Scope = {};
    for (const c of path) (s as Record<string, string>)[c.dim] = c.key;
    return s;
  }, [path]);

  const bundle = useMemo(() => computeBundle(data.rows, data.prevAvg, scope, data.meta.sectionLabels), [data, scope]);

  async function run(kind: "xlsx" | "pdf") {
    setBusy(kind);
    try {
      const spec = analysisReport(data.rows, data.prevAvg, scope, {
        school: data.meta.school,
        logoUrl: data.meta.logoUrl,
        term: data.meta.termLabel,
        session: data.meta.session,
        prevLabel: data.meta.prevLabel,
        sectionLabels: data.meta.sectionLabels,
      });
      if (kind === "xlsx") await exportExcel(spec);
      else await exportPdf(spec);
    } finally {
      setBusy(null);
    }
  }

  if (data.rows.length === 0) {
    return <Card className="text-center text-[13px] text-ink-4">No results are available for your scope yet ({data.meta.scopeLabel}).</Card>;
  }

  const dimLabel: Record<Dim, string> = { section: "section", level: "class level", arm: "arm", department: "department", subject: "subject" };

  return (
    <div>
      {/* breadcrumb + export */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-1 text-[13px]">
          <button onClick={() => setPath([])} className={`rounded-[8px] px-2 py-1 font-medium transition ${path.length === 0 ? "bg-forest-soft text-forest" : "text-ink-3 hover:bg-secondary"}`}>
            Whole school
          </button>
          {path.map((c, i) => (
            <span key={c.dim} className="flex items-center gap-1">
              <Icon name="chevR" size={13} className="text-ink-4" />
              <button
                onClick={() => setPath(path.slice(0, i + 1))}
                className={`rounded-[8px] px-2 py-1 font-medium transition ${i === path.length - 1 ? "bg-forest-soft text-forest" : "text-ink-3 hover:bg-secondary"}`}
              >
                {c.label}
              </button>
            </span>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Pill tone="neutral">{data.meta.scopeLabel}</Pill>
          <Button kind="ghost" size="sm" icon="download" disabled={!!busy} onClick={() => run("xlsx")}>{busy === "xlsx" ? "…" : "Excel"}</Button>
          <Button kind="ghost" size="sm" icon="reports" disabled={!!busy} onClick={() => run("pdf")}>{busy === "pdf" ? "…" : "PDF"}</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI label="Students scored" value={String(bundle.count)} delta={bundle.scopeTitle} sub="" icon="students" />
        <KPI label="Average" value={String(bundle.average)} delta="of 100" sub="" icon="target" />
        <KPI label="Pass rate" value={`${bundle.passRate}%`} delta="≥ 50" deltaTone={bundle.passRate >= 60 ? "green" : "amber"} sub="" icon="check" />
        <KPI label="Top student" value={bundle.bestStudents[0]?.average != null ? String(bundle.bestStudents[0].average) : "—"} delta={bundle.bestStudents[0]?.name ?? "—"} deltaTone="green" sub="" icon="trend" />
      </div>

      {/* drill-down children */}
      {bundle.childDim && bundle.children.length > 0 && (
        <Card className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-body font-semibold text-ink">Drill into {dimLabel[bundle.childDim]}</h2>
            <span className="text-[12px] text-ink-4">{bundle.children.length} {dimLabel[bundle.childDim]}s · click to scope</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {bundle.children.map((ch) => (
              <button
                key={ch.key}
                onClick={() => setPath([...path, { dim: ch.dim, key: ch.key, label: ch.label }])}
                className="group rounded-[var(--radius-card)] border border-border bg-card p-3 text-left transition hover:border-forest-line hover:bg-forest-soft/40"
              >
                <div className="flex items-center justify-between">
                  <span className="truncate text-[13px] font-semibold text-ink">{ch.label}</span>
                  <Icon name="chevR" size={14} className="text-ink-4 transition group-hover:translate-x-0.5" />
                </div>
                <div className="mt-1 flex items-center gap-2 text-[12px] text-ink-4">
                  <span className="font-semibold text-forest">{ch.average}</span> avg · {ch.count} students
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* best students */}
        <Card>
          <h2 className="mb-3 text-body font-semibold text-ink">Overall best students</h2>
          <div className="flex flex-col gap-2">
            {bundle.bestStudents.map((b, i) => (
              <div key={b.studentId} className="flex items-center gap-3">
                <span className="w-5 text-center text-[13px] font-bold text-ink-4">{i + 1}</span>
                <Avatar name={b.name} hue={hueOf(b.studentId)} size={30} />
                <Link href={`/people/students/${b.studentId}`} className="min-w-0 flex-1 transition hover:text-forest">
                  <span className="block truncate text-[13px] font-medium text-ink hover:text-forest">{b.name}</span>
                  <span className="block text-[11.5px] text-ink-4">{b.className}{b.department ? ` · ${b.department}` : ""}</span>
                </Link>
                <Pill tone={i === 0 ? "green" : "neutral"}>{b.average}</Pill>
              </div>
            ))}
          </div>
        </Card>

        {/* most improved */}
        <Card>
          <h2 className="mb-1 text-body font-semibold text-ink">Most improved</h2>
          <div className="mb-3 text-[12px] text-ink-4">vs {data.meta.prevLabel}</div>
          {bundle.mostImproved.length === 0 ? (
            <div className="text-[13px] text-ink-4">No prior-term data to compare at this scope.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {bundle.mostImproved.slice(0, 6).map((m) => (
                <div key={m.studentId} className="flex items-center gap-3">
                  <Avatar name={m.name} hue={hueOf(m.studentId)} size={30} />
                  <Link href={`/people/students/${m.studentId}`} className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink transition hover:text-forest">{m.name}</Link>
                  <span className="text-[12px] text-ink-4">{m.from} → {m.to}</span>
                  <Pill tone="green">+{m.delta}</Pill>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* best per subject */}
        <Card>
          <h2 className="mb-3 text-body font-semibold text-ink">Best in each subject</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.05em] text-ink-4">
                  <th className="py-1.5 text-left font-medium">Subject</th>
                  <th className="py-1.5 text-left font-medium">Top student</th>
                  <th className="py-1.5 text-right font-medium">Score</th>
                  <th className="py-1.5 text-right font-medium">Avg</th>
                </tr>
              </thead>
              <tbody>
                {bundle.bestPerSubject.map((s) => (
                  <tr key={s.subject} className="border-t border-border">
                    <td className="py-1.5 font-medium text-ink">{s.subject}</td>
                    <td className="py-1.5 text-ink-2">{s.best?.name ?? "—"}</td>
                    <td className="py-1.5 text-right font-semibold text-ink">{s.best?.total ?? "—"}</td>
                    <td className="py-1.5 text-right text-ink-3">{s.average}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* best per department OR weakest subjects */}
        {bundle.bestPerDept.length > 0 ? (
          <Card>
            <h2 className="mb-3 text-body font-semibold text-ink">Best in each department</h2>
            <div className="flex flex-col gap-2.5">
              {bundle.bestPerDept.map((d) => (
                <div key={d.department} className="flex items-center gap-3">
                  <Pill tone="forest">{d.department}</Pill>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{d.best?.name ?? "—"}</span>
                  <Pill tone="neutral">{d.best?.average ?? "—"}</Pill>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card>
            <h2 className="mb-3 text-body font-semibold text-ink">Weakest subjects</h2>
            <div className="flex flex-col gap-2.5">
              {bundle.weakest.map((w) => (
                <BarRow key={w.subject} label={w.subject} value={w.average} max={100} tone={w.average >= 50 ? "amber" : "red"} />
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* full ranked list */}
      <Card className="mt-5" pad={0}>
        <div className="flex items-center justify-between p-5">
          <h2 className="text-body font-semibold text-ink">Full ranked list · {bundle.ranked.length}</h2>
          <span className="text-[12px] text-ink-4">{bundle.scopeTitle}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-y border-border text-[11px] uppercase tracking-[0.05em] text-ink-4">
                <th className="px-5 py-2 text-left font-medium">#</th>
                <th className="px-5 py-2 text-left font-medium">Student</th>
                <th className="px-5 py-2 text-left font-medium">Class</th>
                <th className="px-5 py-2 text-left font-medium">Department</th>
                <th className="px-5 py-2 text-right font-medium">Average</th>
              </tr>
            </thead>
            <tbody>
              {bundle.ranked.map((rk, i) => (
                <tr key={rk.studentId} className="border-b border-border last:border-0 hover:bg-secondary/50">
                  <td className="px-5 py-2 text-ink-4">{i + 1}</td>
                  <td className="px-5 py-2 font-medium text-ink">
                    <Link href={`/people/students/${rk.studentId}`} className="transition hover:text-forest">{rk.name}</Link>
                  </td>
                  <td className="px-5 py-2 text-ink-3">{rk.className}</td>
                  <td className="px-5 py-2 text-ink-3">{rk.department ?? "—"}</td>
                  <td className="px-5 py-2 text-right font-semibold text-ink">{rk.average}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
