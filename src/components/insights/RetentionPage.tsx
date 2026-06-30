"use client";

import { useMemo } from "react";
import { Card, SectionTitle, Pill, BarRow } from "@/components/ui/primitives";
import { KPI } from "@/components/ui/KPI";
import { Icon } from "@/components/ui/Icon";
import { STUDENTS, COUNTS, LEVELS } from "@/data/people";

const REASON_COLORS: Record<string, string> = {
  Financial: "#dc2626",
  Relocation: "#2563eb",
  "Transfer to another school": "#f59e0b",
  "Family reasons": "#9a9a94",
};

function Donut({ data, size = 150 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const segs = data.filter((d) => d.value > 0);
  const total = segs.reduce((a, d) => a + d.value, 0) || 1;
  const r = size / 2;
  const ir = r * 0.62;
  let acc = 0;
  const seg = (val: number) => {
    const a0 = (acc / total) * 2 * Math.PI;
    acc += val;
    const a1 = (acc / total) * 2 * Math.PI;
    const pt = (ang: number, rad: number) => [r + rad * Math.sin(ang), r - rad * Math.cos(ang)];
    const [x0, y0] = pt(a0, r);
    const [x1, y1] = pt(a1, r);
    const [x2, y2] = pt(a1, ir);
    const [x3, y3] = pt(a0, ir);
    const lg = a1 - a0 > Math.PI ? 1 : 0;
    return `M${x0},${y0} A${r},${r} 0 ${lg} 1 ${x1},${y1} L${x2},${y2} A${ir},${ir} 0 ${lg} 0 ${x3},${y3} Z`;
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segs.map((d, i) => (
        <path key={i} d={seg(d.value)} fill={d.color} />
      ))}
      <text x={r} y={r - 1} textAnchor="middle" style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-display)", fill: "var(--color-ink)" }}>
        {total}
      </text>
      <text x={r} y={r + 16} textAnchor="middle" style={{ fontSize: 10, fill: "var(--color-ink-4)" }}>
        leavers
      </text>
    </svg>
  );
}

export function RetentionPage() {
  const d = useMemo(() => {
    const grad = COUNTS.graduated;
    const left = COUNTS.left;
    const gradRate = Math.round((grad / (grad + left)) * 100);
    const retention = Math.round((COUNTS.active / (COUNTS.active + left)) * 100);

    const attrition: Record<string, number> = {};
    STUDENTS.filter((s) => s.status === "left").forEach((s) => (attrition[s.level] = (attrition[s.level] || 0) + 1));
    const attRows = Object.entries(attrition).sort((a, b) => LEVELS.indexOf(a[0] as never) - LEVELS.indexOf(b[0] as never));
    const peak = Object.entries(attrition).sort((a, b) => b[1] - a[1])[0];

    const reasons: Record<string, number> = {};
    STUDENTS.filter((s) => s.status === "left").forEach((s) => (reasons[s.leftReason!] = (reasons[s.leftReason!] || 0) + 1));
    const reasonData = Object.entries(reasons).map(([label, value]) => ({ label, value, color: REASON_COLORS[label] || "#9a9a94" }));

    const byYear: Record<string, { entered: number; grad: number; left: number }> = {};
    STUDENTS.forEach((s) => {
      const y = s.admissionNo.split("-")[1];
      byYear[y] = byYear[y] || { entered: 0, grad: 0, left: 0 };
      byYear[y].entered++;
      if (s.status === "graduated") byYear[y].grad++;
      if (s.status === "left") byYear[y].left++;
    });
    const cohorts = Object.keys(byYear)
      .sort()
      .map((y) => {
        const c = byYear[y];
        const res = c.grad + c.left;
        return { y, ...c, rate: res ? Math.round((c.grad / res) * 100) : 0, res };
      });

    return { grad, left, gradRate, retention, attRows, peak, reasonData, cohorts };
  }, []);

  const maxAtt = Math.max(1, ...d.attRows.map((r) => r[1]));

  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle eyebrow="Insights" title="Retention & Graduation Analytics" sub="Are you keeping your students, and getting them to graduation? Computed from real status data." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI label="Graduation rate" value={`${d.gradRate}%`} delta="of leavers" deltaTone="green" sub={`${d.grad} graduated`} icon="badge" />
        <KPI label="Active population" value={String(COUNTS.active)} delta={`of ${COUNTS.allTime}`} sub="currently enrolled" icon="students" />
        <KPI label="Total alumni" value={String(d.grad)} delta="completed" deltaTone="green" sub="finished SSS 3" icon="trend" />
        <KPI label="Early leavers" value={String(d.left)} delta={`${Math.round((d.left / COUNTS.allTime) * 100)}%`} deltaTone="amber" sub="of all-time" icon="shield" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-5 flex items-center gap-2 text-[14px] font-semibold text-ink">
            Where students leave <span className="font-normal text-ink-4">— by last class</span>
          </div>
          <div className="flex flex-col gap-3.5">
            {d.attRows.map(([lvl, n]) => (
              <div key={lvl} className="flex items-center gap-3">
                <span className="w-24 flex-none text-[13px] font-medium text-ink-2">{lvl}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full" style={{ width: `${(n / maxAtt) * 100}%`, background: d.peak && d.peak[0] === lvl ? "var(--color-red)" : "var(--color-amber)" }} />
                </div>
                <span className="w-8 flex-none text-right text-[13px] font-semibold text-ink">{n}</span>
                {d.peak && d.peak[0] === lvl && <Pill tone="red">peak</Pill>}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-3 text-[14px] font-semibold text-ink">Why they leave</div>
          <div className="flex items-center gap-4">
            <Donut data={d.reasonData} />
            <div className="flex-1">
              {d.reasonData.map((r) => (
                <div key={r.label} className="mb-1.5 flex items-center gap-2 text-[12.5px]">
                  <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: r.color }} />
                  <span className="flex-1 truncate text-ink-2">{r.label}</span>
                  <span className="font-semibold text-ink">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-5 flex items-start gap-3.5" style={{ background: "var(--color-amber-soft)", borderColor: "#f4ddb0" }}>
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] bg-white text-amber-2">
          <Icon name="sparkle" size={19} />
        </span>
        <div>
          <div className="text-[14px] font-semibold text-amber-2">Owner insight</div>
          <p className="mt-1 text-[13px] text-ink-2">
            {d.peak ? `Withdrawals peak at ${d.peak[0]} (${d.peak[1]} students). ` : ""}
            If the spike is financial around the JSS 3 → SSS 1 transition, introducing earlier installment plans could retain more students through to graduation.
          </p>
        </div>
      </Card>

      <Card pad={0} className="mt-5 overflow-hidden">
        <div className="p-5 text-[14px] font-semibold text-ink">Cohort detail</div>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-y border-border text-[11px] uppercase tracking-[0.05em] text-ink-4">
              <th className="px-5 py-2.5 text-left font-medium">Entry cohort</th>
              <th className="px-5 py-2.5 text-right font-medium">Entered</th>
              <th className="px-5 py-2.5 text-right font-medium">Graduated</th>
              <th className="px-5 py-2.5 text-right font-medium">Left early</th>
              <th className="px-5 py-2.5 text-right font-medium">Grad rate</th>
            </tr>
          </thead>
          <tbody>
            {d.cohorts.map((c) => (
              <tr key={c.y} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium text-ink">
                  {c.y}/{(+c.y + 1).toString().slice(2)}
                </td>
                <td className="px-5 py-3 text-right text-ink-3">{c.entered}</td>
                <td className="px-5 py-3 text-right font-semibold text-forest">{c.grad}</td>
                <td className="px-5 py-3 text-right text-amber-2">{c.left}</td>
                <td className="px-5 py-3 text-right">
                  <Pill tone={c.rate >= 60 ? "green" : c.rate >= 40 ? "amber" : "red"}>{c.res ? `${c.rate}%` : "—"}</Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
