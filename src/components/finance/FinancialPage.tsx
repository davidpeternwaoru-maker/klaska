"use client";

import { useMemo, useState } from "react";
import { Card, SectionTitle, Pill, Button } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { financials, feesSummary, payrollGroups, RECENT_EXPENSES } from "@/data/finance";
import { ngn, ngnCompact, SCHOOL } from "@/data/overview";
import { exportFinancialExcel, exportFinancialPDF, type FinancialData } from "@/lib/export/exporters";

const CAT_COLORS: Record<string, string> = {
  Salaries: "var(--color-forest)",
  "Diesel & Power": "var(--color-amber)",
  Maintenance: "var(--color-blue)",
  Supplies: "var(--color-ink-4)",
  Levies: "var(--color-red)",
};
const CAT_TONE: Record<string, "neutral" | "amber" | "blue" | "red"> = {
  Salaries: "neutral",
  "Diesel & Power": "amber",
  Maintenance: "blue",
  Supplies: "neutral",
  Levies: "red",
};

export function FinancialPage() {
  const d = useMemo(() => financials(), []);
  const fees = useMemo(() => feesSummary(), []);
  const pay = useMemo(() => payrollGroups(), []);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(kind: "xlsx" | "pdf") {
    setBusy(kind);
    const data: FinancialData = {
      revenue: d.revenue,
      expected: d.expected,
      costs: d.costs,
      profit: d.profit,
      margin: d.margin,
      byCategory: d.byCategory,
      byClass: fees.byClass.map((c) => ({ klass: c.klass, paid: c.paid, due: c.due, rate: c.rate })),
    };
    const meta = { name: SCHOOL.name, term: SCHOOL.term, session: SCHOOL.session };
    try {
      if (kind === "xlsx") await exportFinancialExcel(data, meta);
      else await exportFinancialPDF(data, meta);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle
        eyebrow="Financial Operating System"
        title="The school's full financial picture — live"
        sub="Revenue, cost, and profit all in one place. Updated as fees come in and expenses are logged."
        right={
          <>
            <Button kind="ghost" size="sm" icon="receipt">
              Tax summary
            </Button>
            <Button kind="ghost" size="sm" icon="download" onClick={() => run("xlsx")}>
              {busy === "xlsx" ? "…" : "Excel"}
            </Button>
            <Button kind="ghost" size="sm" icon="reports" onClick={() => run("pdf")}>
              {busy === "pdf" ? "…" : "PDF"}
            </Button>
            <Button kind="primary" size="sm" icon="plus">
              Log expense
            </Button>
          </>
        }
      />

      {/* green hero */}
      <div className="overflow-hidden rounded-2xl text-white shadow-[var(--shadow-2)]" style={{ background: "linear-gradient(135deg,#1d6322,#0f3812)" }}>
        <div className="grid grid-cols-2 gap-y-6 p-6 lg:grid-cols-4">
          <HeroStat label="Revenue (term)" value={ngnCompact(d.revenue)} sub="Fees + other income" delta="+12.4% vs last term" />
          <HeroStat label="Operating costs" value={`– ${ngnCompact(d.costs)}`} sub="Salaries, diesel, supplies" delta="–3.1% vs last term" amber />
          <HeroStat label="Net profit" value={ngnCompact(d.profit)} sub={`Profit margin ${d.margin}%`} delta="+₦5.2M vs last term" amber />
          <HeroStat label="Cash on hand" value={ngnCompact(d.cashOnHand)} sub="GTBank · 0123456789" delta="Last sync 9 min ago" muted />
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-white/10 px-6 py-3 text-[12.5px] text-white/75">
          <span className="flex items-center gap-1.5">
            <span className="k-live-dot h-2 w-2 rounded-full bg-[#7BC681]" /> Updating live
          </span>
          <span>Last expense: 12 min ago · {RECENT_EXPENSES[0].category}</span>
          <span>Last payment: 24 min ago · ₦100,000 from Aisha Bello</span>
          <button className="ml-auto inline-flex items-center gap-1.5 font-medium text-white hover:underline">
            View full P&L <Icon name="arrowR" size={14} />
          </button>
        </div>
      </div>

      {/* revenue/cost/profit + cost breakdown */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-1 flex items-start justify-between">
            <div>
              <div className="font-display text-[15px] font-semibold text-ink">Revenue · Cost · Profit</div>
              <div className="text-[12.5px] text-ink-4">Last 6 months · ₦ millions</div>
            </div>
            <div className="flex items-center gap-3 text-[12px] font-medium">
              <Legend color="var(--color-forest)" label="Revenue" />
              <Legend color="var(--color-red)" label="Cost" />
              <Legend color="var(--color-amber)" label="Profit" />
            </div>
          </div>
          <GroupedBars data={d.monthly} />
        </Card>

        <Card>
          <div className="mb-1 font-display text-[15px] font-semibold text-ink">Cost breakdown</div>
          <div className="text-[12.5px] text-ink-4">May 2026</div>
          <div className="mt-4 flex items-center gap-4">
            <Donut data={d.byCategory.map((c) => ({ value: c.value, color: CAT_COLORS[c.label] }))} total={ngnCompact(d.costs)} />
            <div className="flex-1">
              {d.byCategory.map((c) => (
                <div key={c.label} className="mb-2 flex items-center gap-2 text-[12.5px]">
                  <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: CAT_COLORS[c.label] }} />
                  <span className="flex-1 truncate text-ink-2">{c.label}</span>
                  <span className="font-semibold text-ink">{ngnCompact(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* revenue by level + payroll */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <div className="mb-1 flex items-start justify-between">
            <div>
              <div className="font-display text-[15px] font-semibold text-ink">Revenue by class level</div>
              <div className="text-[12.5px] text-ink-4">This term, collected</div>
            </div>
            <Pill tone="forest">SSS 3 leads</Pill>
          </div>
          <LevelBars data={d.byLevel} />
        </Card>

        <Card>
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="font-display text-[15px] font-semibold text-ink">Payroll · May 2026</div>
              <div className="text-[12.5px] text-ink-4">Due in 4 days · {pay.headcount} staff</div>
            </div>
            <Pill tone="amber">Due 26 May</Pill>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {pay.groups.map((g) => (
              <div key={g.label} className="rounded-[12px] bg-secondary p-3">
                <div className="text-[11.5px] text-ink-4">{g.label}</div>
                <div className="mt-0.5 font-display text-[16px] font-bold text-ink">{ngnCompact(g.amount)}</div>
                <div className="text-[11px] text-ink-4">{g.staff} staff</div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-[12px] bg-secondary p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-ink-2">Total payroll</span>
              <span className="font-display text-[18px] font-bold text-ink">{ngn(pay.total)}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-forest" style={{ width: "88%" }} />
            </div>
            <div className="mt-1.5 text-[11.5px] text-ink-4">88% prepared · awaiting bursar approval</div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button kind="ghost" size="sm" style={{ flex: 1, justifyContent: "center" }}>
              Review payslips
            </Button>
            <Button kind="primary" size="sm" style={{ flex: 1, justifyContent: "center" }}>
              Approve payroll
            </Button>
          </div>
        </Card>
      </div>

      {/* recent expenses */}
      <Card pad={0} className="mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="font-display text-[15px] font-semibold text-ink">Recent expenses</div>
          <div className="flex gap-2">
            <Button kind="ghost" size="sm" icon="filter">
              Filter
            </Button>
            <Button kind="primary" size="sm" icon="plus">
              Add expense
            </Button>
          </div>
        </div>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-y border-border text-[11px] uppercase tracking-[0.05em] text-ink-4">
              <th className="px-4 py-2.5 text-left font-medium">Date</th>
              <th className="px-4 py-2.5 text-left font-medium">Category</th>
              <th className="px-4 py-2.5 text-left font-medium">Vendor / description</th>
              <th className="px-4 py-2.5 text-right font-medium">Amount</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {RECENT_EXPENSES.map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/60">
                <td className="px-4 py-3">
                  <span className="font-medium text-ink">{e.date}</span> <span className="ml-1 text-[11.5px] text-ink-4">{e.ref}</span>
                </td>
                <td className="px-4 py-3">
                  <Pill tone={CAT_TONE[e.category] ?? "neutral"}>{e.category}</Pill>
                </td>
                <td className="px-4 py-3 text-ink-2">{e.vendor}</td>
                <td className="px-4 py-3 text-right font-semibold text-ink">{ngn(e.amount)}</td>
                <td className="px-4 py-3">
                  <Pill tone={e.status === "Paid" ? "green" : "amber"}>
                    {e.status === "Paid" && <Icon name="check" size={11} />} {e.status}
                  </Pill>
                </td>
                <td className="px-4 py-3 text-right text-ink-4">
                  <Icon name="dots" size={16} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function HeroStat({ label, value, sub, delta, amber, muted }: { label: string; value: string; sub: string; delta: string; amber?: boolean; muted?: boolean }) {
  return (
    <div className="border-white/10 px-1 lg:border-l lg:first:border-l-0 lg:pl-6 lg:first:pl-1">
      <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-white/65">{label}</div>
      <div className="mt-1.5 font-display text-[30px] font-bold leading-none tracking-[-0.03em]">{value}</div>
      <div className="mt-2 text-[12px] text-white/65">{sub}</div>
      <div className={`mt-0.5 text-[12px] font-medium ${muted ? "text-white/55" : amber ? "text-[#f7b955]" : "text-[#7BC681]"}`}>{delta}</div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-ink-3">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} /> {label}
    </span>
  );
}

function GroupedBars({ data }: { data: { m: string; rev: number; cost: number; profit: number }[] }) {
  const max = Math.max(...data.map((d) => d.rev)) * 1.1 || 1;
  const h = 180;
  return (
    <div className="mt-4">
      <div className="flex items-end justify-between gap-3" style={{ height: h }}>
        {data.map((d) => (
          <div key={d.m} className="flex flex-1 items-end justify-center gap-1">
            {[
              { v: d.rev, c: "var(--color-forest)" },
              { v: d.cost, c: "var(--color-red)" },
              { v: d.profit, c: "var(--color-amber)" },
            ].map((b, i) => (
              <div
                key={i}
                className="w-[22%] rounded-t-[4px]"
                style={{ height: `${(b.v / max) * h}px`, background: b.c, animation: `k-rise 0.6s cubic-bezier(.2,.8,.2,1) ${i * 0.05}s backwards` }}
                title={ngn(b.v)}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between px-1 text-[11px] font-medium text-ink-4">
        {data.map((d) => (
          <span key={d.m} className="flex-1 text-center">
            {d.m}
          </span>
        ))}
      </div>
    </div>
  );
}

function LevelBars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value)) * 1.1 || 1;
  const h = 170;
  return (
    <div className="mt-4">
      <div className="flex items-end justify-between gap-2.5" style={{ height: h }}>
        {data.map((d, i) => (
          <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-2">
            <div
              className="w-full max-w-[42px] rounded-t-[5px]"
              style={{ height: `${(d.value / max) * h}px`, background: `hsl(140 60% ${38 - i * 3}%)`, animation: `k-rise 0.6s cubic-bezier(.2,.8,.2,1) ${i * 0.05}s backwards` }}
              title={ngn(d.value)}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between px-1 text-[11px] font-medium text-ink-4">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Donut({ data, total, size = 132 }: { data: { value: number; color: string }[]; total: string; size?: number }) {
  const segs = data.filter((d) => d.value > 0);
  const sum = segs.reduce((a, d) => a + d.value, 0) || 1;
  const r = size / 2;
  const ir = r * 0.64;
  let acc = 0;
  const seg = (val: number) => {
    const a0 = (acc / sum) * 2 * Math.PI;
    acc += val;
    const a1 = (acc / sum) * 2 * Math.PI;
    const pt = (ang: number, rad: number) => [r + rad * Math.sin(ang), r - rad * Math.cos(ang)];
    const [x0, y0] = pt(a0, r);
    const [x1, y1] = pt(a1, r);
    const [x2, y2] = pt(a1, ir);
    const [x3, y3] = pt(a0, ir);
    const lg = a1 - a0 > Math.PI ? 1 : 0;
    return `M${x0},${y0} A${r},${r} 0 ${lg} 1 ${x1},${y1} L${x2},${y2} A${ir},${ir} 0 ${lg} 0 ${x3},${y3} Z`;
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-none">
      {segs.map((d, i) => (
        <path key={i} d={seg(d.value)} fill={d.color} />
      ))}
      <text x={r} y={r - 2} textAnchor="middle" style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-display)", fill: "var(--color-ink)" }}>
        {total}
      </text>
      <text x={r} y={r + 13} textAnchor="middle" style={{ fontSize: 9, fill: "var(--color-ink-4)" }}>
        total costs
      </text>
    </svg>
  );
}
