"use client";

import { Card, SectionTitle, Pill, Button } from "@/components/ui/primitives";
import { KPI } from "@/components/ui/KPI";
import { Icon } from "@/components/ui/Icon";
import { LineChart, BarChart, AxisLabels } from "@/components/charts/Charts";
import {
  SCHOOL,
  OVERVIEW,
  ngnCompact,
  COLLECTION_TREND,
  ATTENDANCE_TREND,
  CLASS_ATTENDANCE,
  ACTIVITY,
  ACTIVITY_ICON,
} from "@/data/overview";

export function OverviewPage() {
  const collectionPct = Math.round((OVERVIEW.feesCollected / OVERVIEW.feesTarget) * 100);
  const presentPct = Math.round((OVERVIEW.presentToday / OVERVIEW.activeStudents) * 100);

  return (
    <div className="mx-auto max-w-[1320px]">
      <SectionTitle
        eyebrow={`${SCHOOL.session} · ${SCHOOL.term}`}
        title="Good morning, Mrs. Ifeoma"
        sub={`Here's how ${SCHOOL.name} is doing today.`}
        right={
          <>
            <Button kind="ghost" size="sm" icon="receipt">
              Log expense
            </Button>
            <Button kind="primary" size="sm" icon="plus">
              Quick action
            </Button>
          </>
        }
      />

      {/* KPI row */}
      <div className="k-stagger grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-6">
        <KPI label="Active students" value={String(OVERVIEW.activeStudents)} delta="+12" sub={`${OVERVIEW.arms} arms`} icon="students" />
        <KPI label="Present today" value={`${presentPct}%`} delta={`${OVERVIEW.presentToday}/${OVERVIEW.activeStudents}`} deltaTone="green" sub={`${OVERVIEW.lateToday} late`} icon="attendance" />
        <KPI label="Fees collected" value={ngnCompact(OVERVIEW.feesCollected)} delta={`${collectionPct}%`} deltaTone="green" sub={`of ${ngnCompact(OVERVIEW.feesTarget)}`} icon="fees" />
        <KPI label="Outstanding" value={ngnCompact(OVERVIEW.outstanding)} delta="-6%" deltaTone="green" sub="vs last term" icon="wallet" />
        <KPI label="Net profit" value={ngnCompact(OVERVIEW.netProfit)} delta={`${OVERVIEW.profitMargin}%`} deltaTone="green" sub="margin" icon="finance" />
        <KPI label="Exam readiness" value={`${OVERVIEW.examReadiness}%`} delta="+4%" deltaTone="green" sub="on-track" icon="ai" />
      </div>

      {/* charts row */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="text-[12px] font-medium text-ink-3">Collection trend</div>
              <div className="mt-1 font-display text-[22px] font-bold tracking-[-0.02em] text-ink">
                {ngnCompact(OVERVIEW.feesCollected)}{" "}
                <span className="text-[13px] font-medium text-ink-4">collected this term</span>
              </div>
            </div>
            <Pill tone="green">
              <span className="k-live-dot mr-1 inline-block h-1.5 w-1.5 rounded-full bg-green" /> {collectionPct}% of target
            </Pill>
          </div>
          <LineChart data={COLLECTION_TREND} height={180} />
          <AxisLabels data={COLLECTION_TREND} />
        </Card>

        <Card>
          <div className="text-[12px] font-medium text-ink-3">Attendance trend</div>
          <div className="mb-4 mt-1 font-display text-[22px] font-bold tracking-[-0.02em] text-ink">
            {presentPct}% <span className="text-[13px] font-medium text-ink-4">present today</span>
          </div>
          <BarChart data={ATTENDANCE_TREND} height={180} />
          <AxisLabels data={ATTENDANCE_TREND} />
        </Card>
      </div>

      {/* class attendance + activity feed */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <span className="font-display text-[15px] font-semibold text-ink">Attendance by class</span>
            <span className="text-[12px] font-medium text-ink-4">Today</span>
          </div>
          <div className="flex flex-col gap-3.5">
            {CLASS_ATTENDANCE.map((c) => {
              const pct = Math.round((c.present / c.total) * 100);
              return (
                <div key={c.klass} className="flex items-center gap-3">
                  <span className="w-16 flex-none text-[12.5px] font-medium text-ink-2">{c.klass}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${pct}%`, background: pct >= 90 ? "var(--color-forest)" : pct >= 80 ? "var(--color-amber)" : "var(--color-red)" }}
                    />
                  </div>
                  <span className="w-12 flex-none text-right text-[12px] font-medium text-ink-3">
                    {c.present}/{c.total}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-display text-[15px] font-semibold text-ink">Recent activity</span>
            <button className="text-[12px] font-medium text-forest hover:underline">View all</button>
          </div>
          <div className="flex flex-col">
            {ACTIVITY.map((a, i) => (
              <div key={a.id} className={`flex items-center gap-3 py-3 ${i > 0 ? "border-t border-border" : ""}`}>
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-secondary text-ink-3">
                  <Icon name={ACTIVITY_ICON[a.kind]} size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">{a.title}</span>
                  <span className="block truncate text-[12px] text-ink-4">{a.meta}</span>
                </span>
                <span className="flex-none text-[12px] text-ink-4">{a.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
